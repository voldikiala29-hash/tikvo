import { HttpError, Env } from './types';
import { ScriptItem, cleanScriptText, parseScriptsJson } from './scriptParse';
import { callProvider, providerChain } from './llm';

// Débit de parole moyen (mots par seconde), aligné sur src/video-engine/montage.ts.
const WORDS_PER_SECOND = 2.8;

// Meta Llama hébergé par Cloudflare Workers AI : pas de clé externe, facturé sur le compte Cloudflare.
export const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const BATCH_SIZE = 10;
const CALL_TIMEOUT_MS = 30_000;

const SYSTEM =
  'Tu es un scénariste expert des vidéos TikTok virales. Tu réponds uniquement avec un tableau JSON valide, sans texte autour.';

export function buildPrompt(niche: string, count: number, avoid: string[], brief?: string | null): string {
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
  if (brief) lines.push(`Inspire-toi de ce style, tiré des sources choisies par l'utilisateur : ${brief}`);
  if (avoid.length > 0) lines.push(`Ne reprends aucun de ces hooks : ${avoid.slice(-20).join(' | ')}.`);
  return lines.join('\n');
}

export async function callModel(env: Env, prompt: string, maxTokens = 2500, system = SYSTEM): Promise<string> {
  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: prompt },
  ];
  // 1. Fournisseurs gratuits configurés, un par un. Un quota atteint ou une panne passe au suivant.
  for (const provider of providerChain(env)) {
    try {
      const text = await callProvider(provider, messages, maxTokens, 25_000);
      console.log(`[ai] réponse de ${provider.name}`);
      return text;
    } catch (err) {
      console.warn(`[ai] ${provider.name} indisponible, essai suivant :`, err instanceof Error ? err.message : err);
    }
  }
  // 2. Workers AI, dernier recours.
  if (!env.AI) throw new HttpError(503, 'ai_unavailable', 'Aucun modèle IA disponible.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(504, 'ai_timeout', 'Le modèle met trop de temps à répondre. Réessaie dans un instant.')), CALL_TIMEOUT_MS);
  });
  try {
    const out = (await Promise.race([
      env.AI.run(AI_MODEL, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
      }),
      timeout,
    ])) as { response?: string } | string;
    return typeof out === 'string' ? out : (out?.response ?? '');
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // Erreur Workers AI (quota quotidien, modèle indisponible…) : message lisible, cause dans les logs.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ai] appel Workers AI échoué', { model: AI_MODEL, message });
    throw new HttpError(503, 'ai_error', 'Le modèle IA est indisponible (quota du jour atteint ou erreur temporaire). Réessaie plus tard.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Scripts d'une niche, par lots successifs. Un lot en échec est ignoré : jamais de blocage. */
export async function generateNicheScripts(env: Env, niche: string, count: number, brief?: string | null): Promise<ScriptItem[]> {
  const result: ScriptItem[] = [];
  const seen = new Set<string>();
  const maxCalls = Math.ceil(count / BATCH_SIZE) + 2;
  for (let call = 0; call < maxCalls && result.length < count; call++) {
    const want = Math.min(BATCH_SIZE, count - result.length);
    try {
      const raw = await callModel(env, buildPrompt(niche, want, result.map((r) => r.hook), brief));
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

/**
 * Réécrit un script pour qu'il dure environ `targetSeconds` à la voix.
 * Erreur 422 si le résultat s'écarte trop de la cible : l'utilisateur relance plutôt que de recevoir n'importe quoi.
 */
export async function rewriteScript(env: Env, script: string, targetSeconds: number, brief?: string | null): Promise<string> {
  const current = script.trim().split(/\s+/).filter(Boolean).length;
  const target = Math.round(targetSeconds * WORDS_PER_SECOND);
  const prompt = [
    'Voici le script d’une vidéo courte en français :',
    script.trim(),
    '',
    `Réécris-le pour qu’il dure environ ${targetSeconds} secondes à voix normale, soit environ ${target} mots (il en contient ${current} aujourd’hui).`,
    ...(brief ? [`Inspire-toi de ce style, tiré des sources de l'utilisateur : ${brief}`] : []),
    'Garde le même sujet et une accroche forte en première ligne. Ton viral, direct, tutoiement. Phrases courtes, pas d’emoji, pas de hashtag, pas de titre.',
    'Réponds uniquement avec le texte du nouveau script, une idée par ligne.',
  ].join('\n');
  const raw = await callModel(env, prompt, Math.max(600, target * 3), 'Tu es un scénariste expert des vidéos TikTok virales. Tu réponds uniquement avec le texte demandé.');
  const text = cleanScriptText(raw);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (text.length < 10 || text.length > 1500 || words < target * 0.6 || words > target * 1.4) {
    throw new HttpError(422, 'rewrite_failed', `Le modèle n’a pas atteint la durée visée (${words} mots au lieu d’environ ${target}). Réessaie.`);
  }
  return text;
}
