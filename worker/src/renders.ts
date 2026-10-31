// Rendus MP4 : création d'un job, lecture de son état, lancement du workflow render-video.yml.
// Un job est une ligne de la table jobs. Son propriétaire est le uid Firebase (colonne open_id, héritée).
import { dispatchWorkflow } from './github';
import { HttpError, Env } from './types';
import { RenderSettings, resolveRenderSettings } from './renderSettings';
import { resolveVoice } from './voices';

const DAILY_LIMIT = 60;

export interface RenderInput {
  title: string;
  hook: string;
  script: string;
  pexelsQuery: string;
  nicheId: string;
  nicheName: string;
  day: string;
  videoKey: string;
  settings: RenderSettings;
  /** 0 = rendu d'origine ; autre valeur = recréation avec d'autres clips. */
  variant: number;
  /** Photos et vidéos de l'utilisateur, décrites : le pipeline choisit celles qui montrent la phrase. */
  media?: unknown[];
}

export interface RenderView {
  id: string;
  status: string;
  step: string;
  progress: number;
  day: string | null;
  videoKey: string | null;
  settings: RenderSettings;
  videoUrl: string | null;
  durationSec: number | null;
  error: string | null;
  createdAt: number;
}

interface JobRow {
  id: string;
  status: string;
  step: string;
  progress: number;
  params: string;
  video_url: string | null;
  duration_sec: number | null;
  error: string | null;
  created_at: number;
}

const bad = (field: string) => new HttpError(400, 'invalid_param', `Champ invalide : ${field}.`);

function text(value: unknown, min: number, max: number, field: string): string {
  if (typeof value !== 'string') throw bad(field);
  const t = value.trim();
  if (t.length < min || t.length > max) throw bad(field);
  return t;
}

export function parseRenderInput(body: Record<string, unknown>): RenderInput {
  const nicheId = text(body.nicheId, 2, 20, 'nicheId');
  if (!/^[a-z]+$/.test(nicheId)) throw bad('nicheId');
  const day = text(body.day, 10, 10, 'day');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw bad('day');
  const videoKey = text(body.videoKey, 12, 16, 'videoKey');
  if (!/^\d{4}-\d{2}-\d{2}-\d$/.test(videoKey)) throw bad('videoKey');

  return {
    title: text(body.title, 1, 150, 'title'),
    hook: text(body.hook, 1, 250, 'hook'),
    script: text(body.script, 10, 1500, 'script'),
    pexelsQuery: text(body.pexelsQuery || 'lifestyle', 1, 100, 'pexelsQuery'),
    nicheId,
    nicheName: text(body.nicheName, 1, 40, 'nicheName'),
    day,
    videoKey,
    settings: resolveRenderSettings(body.settings),
    variant: Number.isInteger(body.variant) ? Math.min(999, Math.max(0, Number(body.variant))) : 0,
  };
}

function toView(row: JobRow): RenderView {
  let params: { day?: string; videoKey?: string; settings?: unknown } = {};
  try {
    params = JSON.parse(row.params) as typeof params;
  } catch {
    /* paramètres illisibles : le job reste consultable sans ces champs */
  }
  return {
    id: row.id,
    status: row.status,
    step: row.step,
    progress: row.progress,
    day: params.day ?? null,
    videoKey: params.videoKey ?? null,
    settings: resolveRenderSettings(params.settings),
    videoUrl: row.status === 'rendered' ? row.video_url : null,
    durationSec: row.duration_sec,
    error: row.error,
    createdAt: row.created_at,
  };
}

/** Même script et mêmes réglages qu'un rendu existant ? */
function sameRequest(paramsJson: string, input: RenderInput): boolean {
  try {
    const p = JSON.parse(paramsJson) as { script?: string; settings?: unknown };
    return p.script === input.script && JSON.stringify(resolveRenderSettings(p.settings)) === JSON.stringify(input.settings);
  } catch {
    return false;
  }
}

/**
 * Crée le rendu d'une vidéo du jour et lance le workflow.
 * Sans force, renvoie le rendu actif ou réussi au même script et aux mêmes réglages (pas de double calcul).
 */
export async function createRender(
  env: Env,
  uid: string,
  input: RenderInput,
  apiUrl: string,
  force: boolean,
): Promise<RenderView> {
  if (!force) {
    const rows = await env.DB.prepare(
      `SELECT * FROM jobs WHERE open_id = ? AND json_extract(params, '$.videoKey') = ? AND status != 'failed'
       ORDER BY created_at DESC LIMIT 10`,
    )
      .bind(uid, input.videoKey)
      .all<JobRow>();
    const same = (rows.results ?? []).find((r) => sameRequest(r.params, input));
    if (same) return toView(same);
  }

  const since = Date.now() - 24 * 3600_000;
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM jobs WHERE open_id = ? AND created_at > ?')
    .bind(uid, since)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= DAILY_LIMIT) {
    throw new HttpError(429, 'quota', `Limite quotidienne atteinte (${DAILY_LIMIT} rendus par jour).`);
  }

  const id = crypto.randomUUID();
  const ts = Date.now();
  const params = {
    niche: { id: input.nicheId, name: input.nicheName },
    hook: input.hook,
    script: input.script,
    keywords: [input.pexelsQuery],
    pexelsIds: [],
    voice: resolveVoice(input.nicheId, input.settings.voice, input.settings.voiceStyle).voice,
    title: input.title,
    day: input.day,
    videoKey: input.videoKey,
    settings: input.settings,
    variant: input.variant,
    media: input.media ?? [],
  };
  await env.DB.prepare(
    `INSERT INTO jobs (id, open_id, status, step, progress, params, created_at, updated_at)
     VALUES (?, ?, 'queued', 'Lancement du serveur de rendu…', 0, ?, ?, ?)`,
  )
    .bind(id, uid, JSON.stringify(params), ts, ts)
    .run();

  try {
    await dispatchWorkflow(env, 'render-video.yml', { job_id: id, api_url: apiUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lancement du rendu impossible.';
    await env.DB.prepare(`UPDATE jobs SET status = 'failed', step = 'Échec du lancement', error = ?, updated_at = ? WHERE id = ?`)
      .bind(message.slice(0, 480), Date.now(), id)
      .run();
    throw err;
  }

  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<JobRow>();
  if (!row) throw new HttpError(500, 'internal', 'Rendu créé mais introuvable.');
  return toView(row);
}

export async function listDayRenders(env: Env, uid: string, day: string): Promise<RenderView[]> {
  const rows = await env.DB.prepare(
    `SELECT * FROM jobs WHERE open_id = ? AND json_extract(params, '$.day') = ? ORDER BY created_at DESC LIMIT 200`,
  )
    .bind(uid, day)
    .all<JobRow>();
  return (rows.results ?? []).map(toView);
}

export async function getRender(env: Env, uid: string, id: string): Promise<RenderView | null> {
  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ? AND open_id = ?').bind(id, uid).first<JobRow>();
  return row ? toView(row) : null;
}
