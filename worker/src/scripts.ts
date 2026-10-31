import { HttpError, Env } from './types';
import { ScriptItem, parseScriptsJson } from './scriptParse';

// Meta Llama hébergé par Cloudflare Workers AI : pas de clé externe, facturé sur le compte Cloudflare.
export const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const BATCH_SIZE = 10;
const CALL_TIMEOUT_MS = 30_000;

const SYSTEM =
  'Tu es un scénariste expert des vidéos TikTok virales. Tu réponds uniquement avec un tableau JSON valide, sans texte autour.';

export function buildPrompt(niche: string, count: number, avoid: string[]): string {
  const lines = [
    `Niche : ${niche}.`,
    `Génère ${count} scripts différents de vidéos courtes (15 secondes maximum) au format JSON :`,
    '[{"hook": "...", "phrase1": "...", "phrase2": "...", "cta": "...", "pexelsQuery": "..."}]',
    'Règles :',
    '- hook : accroche punchy, moins de 10 mots ;',
    '- phrase1 et phrase2 : deux actions concrètes à faire aujourd’hui ;',
    '- cta : une invitation à s’abonner ;',
    '- pexelsQuery : 2 à 4 mots en anglais décrivant une vidéo d’illustration stock (exemple : "laptop typing code"), tous différents.',
    'Ton viral, en français, tutoiement.',
  ];
  if (avoid.length > 0) lines.push(`Ne reprends aucun de ces hooks : ${avoid.slice(-20).join(' | ')}.`);
  return lines.join('\n');
}

async function callModel(env: Env, prompt: string): Promise<string> {
  if (!env.AI) throw new HttpError(503, 'ai_unavailable', 'Workers AI non configuré.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('délai dépassé')), CALL_TIMEOUT_MS);
  });
  try {
    const out = (await Promise.race([
      env.AI.run(AI_MODEL, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2500,
      }),
      timeout,
    ])) as { response?: string } | string;
    return typeof out === 'string' ? out : (out?.response ?? '');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Scripts d'une niche, par lots successifs. Un lot en échec est ignoré : jamais de blocage. */
export async function generateNicheScripts(env: Env, niche: string, count: number): Promise<ScriptItem[]> {
  const result: ScriptItem[] = [];
  const seen = new Set<string>();
  const maxCalls = Math.ceil(count / BATCH_SIZE) + 2;
  for (let call = 0; call < maxCalls && result.length < count; call++) {
    const want = Math.min(BATCH_SIZE, count - result.length);
    try {
      const raw = await callModel(env, buildPrompt(niche, want, result.map((r) => r.hook)));
      for (const item of parseScriptsJson(raw)) {
        const key = item.hook.toLowerCase();
        if (seen.has(key) || result.length >= count) continue;
        seen.add(key);
        result.push(item);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[scripts] lot IA ignoré', { niche, message });
      if (err instanceof HttpError && err.code === 'ai_unavailable') break;
    }
  }
  return result;
}
