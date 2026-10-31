import { dispatchWorkflow } from './github';
import { requireFirebaseUser, searchStockVideos } from './pexels';
import {
  asRecord,
  parseJobParams,
  parsePublishInput,
  publicJob,
} from './jobs';
import {
  AccountRow,
  Env,
  HttpError,
  JOB_STATUSES,
  JobRow,
  JobStatus,
  PublishInfo,
} from './types';
import {
  clampString,
  encryptText,
  now,
  parseJson,
  randomToken,
  safeEqual,
  sha256Hex,
} from './util';

const MAX_JOBS_PER_DAY = 20;
const MAX_ACTIVE_JOBS = 2;
const STUCK_RENDER_MS = 35 * 60_000;
const STUCK_PUBLISH_MS = 20 * 60_000;

// ---------------------------------------------------------------- réponses

function allowedOrigins(env: Env): string[] {
  const list = [(env.EXTRA_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)].flat();
  try {
    list.push(new URL(env.FRONTEND_URL).origin);
  } catch {
    /* FRONTEND_URL invalide : ignoré */
  }
  return list;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function respond(request: Request, env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 100_000) throw new HttpError(413, 'too_large', 'Requête trop volumineuse.');
  if (!text) return {};
  try {
    return asRecord(JSON.parse(text));
  } catch {
    throw new HttpError(400, 'invalid_json', 'Corps JSON invalide.');
  }
}

function frontBase(env: Env): string {
  return env.FRONTEND_URL.replace(/\/+$/, '');
}


function requireRenderSecret(env: Env): string {
  if (!env.RENDER_SECRET || env.RENDER_SECRET.length < 16) {
    throw new HttpError(503, 'not_configured', 'RENDER_SECRET manquant ou trop court côté serveur (16 caractères minimum, voir SETUP.md).');
  }
  return env.RENDER_SECRET;
}

async function requireInternal(request: Request, env: Env): Promise<void> {
  const secret = requireRenderSecret(env);
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !(await safeEqual(token, secret))) {
    throw new HttpError(401, 'unauthorized', 'Accès interne refusé.');
  }
}

async function getJobById(env: Env, id: string): Promise<JobRow> {
  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<JobRow>();
  if (!row) throw new HttpError(404, 'not_found', 'Job introuvable.');
  return row;
}

interface PexelsFile {
  quality?: string;
  file_type?: string;
  width?: number;
  height?: number;
  link: string;
}
interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  width: number;
  height: number;
  user?: { name?: string; url?: string };
  video_files?: PexelsFile[];
}

async function handleInternalGetJob(request: Request, env: Env, id: string): Promise<Response> {
  await requireInternal(request, env);
  const row = await getJobById(env, id);
  return respond(request, env, {
    id: row.id,
    status: row.status,
    params: parseJson(row.params, {}),
    publish: parseJson<PublishInfo>(row.publish, {}),
    videoUrl: row.video_url,
  });
}

async function handleInternalPatchJob(request: Request, env: Env, id: string): Promise<Response> {
  await requireInternal(request, env);
  const row = await getJobById(env, id);
  const body = await readJson(request);

  const status = body.status === undefined ? row.status : (body.status as JobStatus);
  if (!JOB_STATUSES.includes(status)) throw new HttpError(400, 'invalid_param', 'Statut invalide.');

  const publish = parseJson<PublishInfo>(row.publish, {});
  if (body.publish !== undefined) {
    const patch = asRecord(body.publish);
    if (typeof patch.publishId === 'string') publish.publishId = patch.publishId.slice(0, 80);
    if (typeof patch.tiktokStatus === 'string') publish.tiktokStatus = patch.tiktokStatus.slice(0, 60);
    if (Array.isArray(patch.postIds)) publish.postIds = patch.postIds.map((p) => String(p).slice(0, 40)).slice(0, 5);
    if (patch.error === null) publish.error = null;
    else if (typeof patch.error === 'string') publish.error = patch.error.slice(0, 500);
    publish.updatedAt = now();
  }

  const progress = typeof body.progress === 'number' ? Math.max(0, Math.min(100, Math.round(body.progress))) : row.progress;
  const error =
    body.error === null ? null : typeof body.error === 'string' ? body.error.slice(0, 500) : row.error;

  await env.DB.prepare(
    `UPDATE jobs SET status = ?, step = ?, progress = ?, video_url = ?, video_bytes = ?, duration_sec = ?, publish = ?, error = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(
      status,
      typeof body.step === 'string' ? body.step.slice(0, 200) : row.step,
      progress,
      typeof body.videoUrl === 'string' ? body.videoUrl.slice(0, 500) : row.video_url,
      typeof body.videoBytes === 'number' ? Math.round(body.videoBytes) : row.video_bytes,
      typeof body.durationSec === 'number' ? body.durationSec : row.duration_sec,
      JSON.stringify(publish),
      error,
      now(),
      id,
    )
    .run();
  return respond(request, env, { ok: true });
}

async function handleHealth(request: Request, env: Env): Promise<Response> {
  let db = true;
  try {
    await env.DB.prepare('SELECT 1').first();
  } catch {
    db = false;
  }
  return respond(request, env, {
    ok: true,
    db,
    configured: {
      github: Boolean(env.GH_DISPATCH_TOKEN),
      render: Boolean(env.RENDER_SECRET && env.RENDER_SECRET.length >= 16),
    },
  });
}

async function runCron(env: Env): Promise<void> {
  const ts = now();
  await env.DB.prepare(
    "UPDATE jobs SET status = 'failed', error = 'Le rendu a dépassé le délai maximum (35 min).', updated_at = ? WHERE status IN ('queued','rendering') AND updated_at < ?",
  )
    .bind(ts, ts - STUCK_RENDER_MS)
    .run();
}

async function handleStockSearch(request: Request, env: Env): Promise<Response> {
  await requireFirebaseUser(request, env);
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (!q) throw new HttpError(400, 'invalid_param', 'Paramètre q manquant.');
  const perPage = Math.min(10, Math.max(3, Number(url.searchParams.get('per_page')) || 3));
  const videos = await searchStockVideos(env, q, perPage);
  return respond(request, env, { videos });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (method === 'GET' && (path === '/' || path === '/health')) return handleHealth(request, env);

  if (method === 'GET' && path === '/api/pexels/search') return handleStockSearch(request, env);
  const m = path.match(/^\/internal\/jobs\/([0-9a-f-]{36})$/);
  if (m && method === 'GET') return handleInternalGetJob(request, env, m[1]);
  if (m && method === 'POST') return handleInternalPatchJob(request, env, m[1]);

  throw new HttpError(404, 'not_found', 'Route inconnue.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (err) {
      if (err instanceof HttpError) {
        return respond(request, env, { error: err.code, message: err.message }, err.status);
      }
      console.error('Erreur interne', err instanceof Error ? err.message : err);
      return respond(request, env, { error: 'internal', message: 'Erreur interne du serveur.' }, 500);
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env).catch((err) => console.error('Erreur cron', err instanceof Error ? err.message : err)));
  },
} satisfies ExportedHandler<Env>;

