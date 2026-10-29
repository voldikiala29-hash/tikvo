import {
  HttpError,
  JobParams,
  JobRow,
  PRIVACY_LEVELS,
  PrivacyLevel,
  PublishInfo,
} from './types';
import { clampString, parseJson } from './util';

export const DEFAULT_VOICE = 'fr-FR-VivienneMultilingualNeural';
const VOICE_PATTERN = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/;

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseJobParams(input: unknown): JobParams {
  const body = asRecord(input);
  const niche = asRecord(body.niche);
  const nicheId = clampString(niche.id, 40).trim();
  const nicheName = clampString(niche.name, 60).trim();
  const hook = clampString(body.hook, 200).trim();
  const script = clampString(body.script, 4000).trim();

  if (!nicheId || !nicheName) throw new HttpError(400, 'invalid_param', 'Niche manquante.');
  if (!hook) throw new HttpError(400, 'invalid_param', 'Le hook est vide.');
  if (script.length < 20) throw new HttpError(400, 'invalid_param', 'Le script est trop court pour générer une voix off.');

  const voice = clampString(body.voice, 80) || DEFAULT_VOICE;
  if (!VOICE_PATTERN.test(voice)) throw new HttpError(400, 'invalid_param', 'Voix non valide.');

  const keywords = Array.isArray(body.keywords)
    ? body.keywords
        .map((k) => clampString(k, 60).trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const pexelsIds = Array.isArray(body.pexelsIds)
    ? body.pexelsIds
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 12)
    : [];

  return { niche: { id: nicheId, name: nicheName }, hook, script, keywords, voice, pexelsIds };
}

export interface PublishInput {
  caption: string;
  privacy: PrivacyLevel;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  isAigc: boolean;
  publishAt: number | null;
}

export function parsePublishInput(input: unknown, nowMs: number): PublishInput {
  const body = asRecord(input);
  const privacy = body.privacy as PrivacyLevel;
  if (!PRIVACY_LEVELS.includes(privacy)) {
    throw new HttpError(400, 'invalid_param', 'Choisis un niveau de confidentialité.');
  }
  const brandContent = body.brandContent === true;
  const brandOrganic = body.brandOrganic === true;
  if (brandContent && privacy === 'SELF_ONLY') {
    throw new HttpError(400, 'invalid_param', "Un contenu de marque ne peut pas être publié en « Moi uniquement ».");
  }

  let publishAt: number | null = null;
  if (body.publishAt !== undefined && body.publishAt !== null) {
    const at = Number(body.publishAt);
    if (!Number.isFinite(at)) throw new HttpError(400, 'invalid_param', 'Date de programmation invalide.');
    if (at > nowMs + 90_000) {
      if (at > nowMs + 30 * 24 * 3600_000) {
        throw new HttpError(400, 'invalid_param', 'La programmation est limitée à 30 jours.');
      }
      publishAt = Math.floor(at);
    }
  }

  return {
    caption: clampString(body.caption, 2200),
    privacy,
    disableComment: body.disableComment === true,
    disableDuet: body.disableDuet === true,
    disableStitch: body.disableStitch === true,
    brandContent,
    brandOrganic,
    isAigc: body.isAigc === true,
    publishAt,
  };
}

export function publicJob(row: JobRow) {
  const params = parseJson<Partial<JobParams>>(row.params, {});
  const publish = parseJson<PublishInfo>(row.publish, {});
  return {
    id: row.id,
    status: row.status,
    step: row.step,
    progress: row.progress,
    params: {
      niche: params.niche ?? null,
      hook: params.hook ?? '',
      voice: params.voice ?? DEFAULT_VOICE,
    },
    videoUrl: row.video_url,
    videoBytes: row.video_bytes,
    durationSec: row.duration_sec,
    publish: {
      caption: publish.caption,
      privacy: publish.privacy,
      publishAt: publish.publishAt,
      publishId: publish.publishId,
      tiktokStatus: publish.tiktokStatus,
      postIds: publish.postIds,
      username: publish.username,
      error: publish.error ?? null,
    },
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
