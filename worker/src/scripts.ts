import { HttpError, Env } from './types';
import { ScriptItem, cleanScriptText, parseScriptsJson } from './scriptParse';
import { callProvider, providerChain } from './llm';
import { DEFAULT_TEXT_MODELS, dedupe, extractWorkersAiText, parseModelList } from './aiModels';

// Débit de parole moyen (mots par seconde), aligné sur src/video-engine/montage.ts.
const WORDS_PER_SECOND = 2.8;

// Premier modèle de la liste par défaut (seulement informatif dans les réponses API).
export const AI_MODEL = DEFAULT_TEXT_MODELS[0];
const BATCH_SIZE = 10;
const CALL_TIMEOUT_MS = 30_000;

/** Modèles Workers AI de texte, dans l'ordre d'essai. Surchargeable par la variable AI_TEXT_MODELS. */
export function textModels(env: Env): string[] {
  return parseModelList(env.AI_TEXT_MODELS, DEFAULT_TEXT_MODELS);
}

/** Lance un modèle Workers AI avec délai maximal. Lève HttpError 504 si le délai est dépassé. */
export async function runWorkersAi(env: Env, model: string, input: Record<string, unknown>, timeoutMs = CALL_TIMEOUT_MS): Promise<unknown> {
  if (!env.AI) throw new HttpError(503, 'ai_unavailable', 'Aucun modèle IA disponible.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HttpError(504, 'ai_timeout', 'Le modèle met trop de temps à répondre. Réessaie dans un instant.')), timeoutMs);
  });
  try {
    return await Promise.race([env.AI.run(model, input), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

/**
 * Texte généré. Ordre : fournisseurs externes gratuits si une clé est configurée, puis les modèles
 * Workers AI (`models`, sinon la liste AI_TEXT_MODELS) un par un. Un modèle en erreur passe au suivant.
 */
export async function callModel(env: Env, prompt: string, maxTokens = 2500, system = SYSTEM, models?: string[]): Promise<string> {
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
  // 2. Workers AI, modèle après modèle.
  if (!env.AI) throw new HttpError(503, 'ai_unavailable', 'Aucun modèle IA disponible.');
  for (const model of dedupe(models ?? textModels(env))) {
    try {
      const out = await runWorkersAi(env, model, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
      });
      const text = extractWorkersAiText(out);
      if (text.trim()) {
        console.log(`[ai] réponse de ${model}`);
        return text;
      }
      console.warn('[ai] réponse vide, modèle suivant', { model });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[ai] modèle Workers AI en échec, essai suivant', { model, message });
    }
  }
  // Tous les modèles ont échoué : message lisible, causes dans les logs ci-dessus.
  throw new HttpError(503, 'ai_error', 'Le modèle IA est indisponible (quota du jour atteint ou erreur temporaire). Réessaie plus tard.');
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
