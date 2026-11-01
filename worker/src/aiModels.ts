// Choix des modèles Workers AI et lecture de leurs réponses. Module pur (aucun import) pour pouvoir être testé sous Node.

/**
 * Modèles de texte, du meilleur au secours. Tous sont proposés sur le plan gratuit de Workers AI.
 * Le plan gratuit refuse les modèles « Workers Paid » (erreur 403, code 5035) : glm-5.3-flash en fait partie,
 * il a donc été écarté. Ordre modifiable sans redéployer le code via la variable AI_TEXT_MODELS (wrangler.toml).
 */
export const DEFAULT_TEXT_MODELS = [
  '@cf/zai-org/glm-4.7-flash',
  '@cf/google/gemma-4-26b-a4b-it',
  '@cf/openai/gpt-oss-120b',
];

/** Modèle rapide pour analyser les sources d'inspiration. */
export const ANALYZE_MODEL = '@cf/openai/gpt-oss-20b';

/** Voix off gratuite. Une seule voix par langue, pas de timings de mot. */
export const TTS_MODEL = '@cf/myshell-ai/melotts';

const MODEL_ID = /^@cf\/[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9.-]*$/i;

/** Lit une liste « m1,m2,m3 » ; ignore les identifiants invalides, supprime les doublons. */
export function parseModelList(raw: string | undefined, fallback: readonly string[]): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => MODEL_ID.test(m));
  return dedupe(list.length > 0 ? list : [...fallback]);
}

export function dedupe(models: string[]): string[] {
  return [...new Set(models)];
}

/** Texte d'une réponse Workers AI : format natif {response} ou format compatible OpenAI {choices}. */
export function extractWorkersAiText(out: unknown): string {
  if (typeof out === 'string') return out;
  if (!out || typeof out !== 'object') return '';
  const record = out as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  if (typeof record.response === 'string') return record.response;
  const content = record.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

/**
 * Octets audio d'une réponse MeloTTS. Selon la version de l'API, le résultat est un flux binaire,
 * un tampon, ou un objet { audio: base64 }.
 */
export async function audioFromOutput(out: unknown): Promise<Uint8Array> {
  if (out instanceof ArrayBuffer) return new Uint8Array(out);
  if (ArrayBuffer.isView(out)) return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  if (out && typeof out === 'object' && typeof (out as { getReader?: unknown }).getReader === 'function') {
    return new Uint8Array(await new Response(out as ReadableStream).arrayBuffer());
  }
  if (out && typeof out === 'object' && typeof (out as { audio?: unknown }).audio === 'string') {
    const b64 = ((out as { audio: string }).audio).replace(/^data:[^,]*,/, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(0);
}
