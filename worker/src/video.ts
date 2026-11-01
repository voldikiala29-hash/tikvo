import { HttpError, Env } from './types';
import { parseModelList } from './aiModels';
import { runWorkersAi } from './scripts';
import { VIDEO_MAX_BYTES, VIDEO_MAX_PROMPT_CHARS, VIDEO_RESOLUTION, clampVideoDuration, extractVideoUrl, utcDay, videoRatio } from './videoRules';

const DEFAULT_VIDEO_MODELS = ['minimax/h3-lite'];
const DEFAULT_DAILY_LIMIT = 5;
const CALL_TIMEOUT_MS = 120_000;

export interface VideoInput {
  prompt: string;
  format: string;
  duration: number;
}

export function parseVideoInput(body: Record<string, unknown>): VideoInput {
  const prompt = typeof body.prompt === 'string' ? body.prompt.replace(/\s+/g, ' ').trim().slice(0, VIDEO_MAX_PROMPT_CHARS) : '';
  if (prompt.length < 10) throw new HttpError(400, 'invalid_param', 'Décris la vidéo en quelques mots (10 caractères minimum).');
  return { prompt, format: videoRatio(body.format), duration: clampVideoDuration(body.duration) };
}

export function videoEnabled(env: Env): boolean {
  return env.VIDEO_GENERATION_ENABLED === 'true';
}

function dailyLimit(env: Env): number {
  const n = Number(env.VIDEO_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

/** Réserve une génération pour le jour en cours. Lève HttpError 429 au-delà de la limite. */
export async function reserveVideoQuota(env: Env, uid: string, now: Date = new Date()): Promise<void> {
  const day = utcDay(now);
  const row = await env.DB.prepare('SELECT count FROM video_usage WHERE uid = ? AND day = ?').bind(uid, day).first<{ count: number }>();
  const used = row?.count ?? 0;
  if (used >= dailyLimit(env)) {
    throw new HttpError(429, 'video_quota', `Limite atteinte : ${dailyLimit(env)} vidéos générées par jour. Réessaie demain (minuit UTC).`);
  }
  await env.DB.prepare(
    'INSERT INTO video_usage (uid, day, count) VALUES (?, ?, 1) ON CONFLICT(uid, day) DO UPDATE SET count = count + 1',
  )
    .bind(uid, day)
    .run();
}

/**
 * Génère une vidéo verticale courte avec le premier modèle disponible, la range dans R2
 * (generated/{uid}/{id}.mp4) et renvoie ses métadonnées. Aucun modèle gratuit : chaque appel est facturé.
 */
export async function generateVideo(env: Env, uid: string, input: VideoInput): Promise<{ id: string; model: string; durationSec: number; bytes: number; ratio: string }> {
  if (!videoEnabled(env)) throw new HttpError(403, 'video_disabled', 'La génération vidéo IA est désactivée (payante).');
  const bucket = env.MEDIA_BUCKET;
  if (!bucket) throw new HttpError(503, 'media_disabled', 'Le stockage des vidéos n’est pas encore activé.');

  await reserveVideoQuota(env, uid);
  const models = parseModelList(env.VIDEO_MODELS, DEFAULT_VIDEO_MODELS);
  let lastError = '';
  for (const model of models) {
    try {
      const out = await runWorkersAi(
        env,
        model,
        {
          content: [{ type: 'text', text: input.prompt }],
          duration: input.duration,
          ratio: input.format,
          resolution: VIDEO_RESOLUTION,
        },
        CALL_TIMEOUT_MS,
      );
      const url = extractVideoUrl(out);
      if (!url) throw new Error('réponse sans adresse de vidéo');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`téléchargement de la vidéo : HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 1000 || bytes.byteLength > VIDEO_MAX_BYTES) throw new Error('vidéo vide ou trop lourde');

      const id = crypto.randomUUID();
      await bucket.put(`generated/${uid}/${id}.mp4`, bytes, { httpMetadata: { contentType: 'video/mp4' } });
      console.log('[video] générée', { model, id, bytes: bytes.byteLength, duration: input.duration });
      return { id, model, durationSec: input.duration, bytes: bytes.byteLength, ratio: input.format };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn('[video] modèle en échec, essai suivant', { model, message: lastError });
    }
  }
  throw new HttpError(503, 'video_error', `La génération vidéo a échoué (${lastError || 'aucun modèle disponible'}). Réessaie plus tard.`);
}

/** Vidéo générée par l'utilisateur connecté, lue dans R2. */
export async function readGeneratedVideo(env: Env, uid: string, id: string): Promise<R2ObjectBody> {
  if (!env.MEDIA_BUCKET) throw new HttpError(503, 'media_disabled', 'Le stockage des vidéos n’est pas encore activé.');
  const object = await env.MEDIA_BUCKET.get(`generated/${uid}/${id}.mp4`);
  if (!object) throw new HttpError(404, 'not_found', 'Vidéo introuvable.');
  return object as R2ObjectBody;
}
