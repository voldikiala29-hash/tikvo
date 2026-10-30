import { dispatchWorkflow } from './github';
import type { TokenResponse } from './tiktok';
import {
  asRecord,
  parseJobParams,
  parsePublishInput,
  publicJob,
} from './jobs';
import {
  authorizeUrl,
  exchangeCode,
  fetchUser,
  getValidAccessToken,
  queryCreatorInfo,
  requireRenderSecret,
  requireTikTokConfig,
  revokeToken,
} from './tiktok';
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

const SESSION_TTL_MS = 30 * 24 * 3600_000;
const STATE_TTL_MS = 10 * 60_000;
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

// ---------------------------------------------------------------- sessions

interface Session {
  openId: string;
}

async function requireSession(request: Request, env: Env): Promise<Session> {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'unauthorized', 'Connexion TikTok requise.');
  const row = await env.DB.prepare('SELECT open_id, expires_at FROM sessions WHERE token_hash = ?')
    .bind(await sha256Hex(token))
    .first<{ open_id: string; expires_at: number }>();
  if (!row || row.expires_at < now()) {
    throw new HttpError(401, 'unauthorized', 'Session expirée : reconnecte TikTok.');
  }
  return { openId: row.open_id };
}

async function requireInternal(request: Request, env: Env): Promise<void> {
  const secret = requireRenderSecret(env);
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !(await safeEqual(token, secret))) {
    throw new HttpError(401, 'unauthorized', 'Accès interne refusé.');
  }
}

async function getOwnedJob(env: Env, openId: string, id: string): Promise<JobRow> {
  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ? AND open_id = ?').bind(id, openId).first<JobRow>();
  if (!row) throw new HttpError(404, 'not_found', 'Vidéo introuvable.');
  return row;
}

async function getJobById(env: Env, id: string): Promise<JobRow> {
  const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<JobRow>();
  if (!row) throw new HttpError(404, 'not_found', 'Job introuvable.');
  return row;
}

// ---------------------------------------------------------------- authentification TikTok

// Le redirect_uri OAuth doit être sur un domaine vérifié chez TikTok (tikvo.store).
// La page /callback du site transmet code+state au Worker (voir public/callback.html).
// Doit être identique à l'aller (authorize) et au retour (token exchange).
function tiktokRedirectUri(env: Env): string {
  return `${frontBase(env)}/callback`;
}

async function handleAuthStart(request: Request, env: Env): Promise<Response> {
  requireTikTokConfig(env);
  requireRenderSecret(env);
  const url = new URL(request.url);
  const state = randomToken(16);
  await env.DB.prepare('INSERT INTO oauth_states (state, created_at) VALUES (?, ?)').bind(state, now()).run();
  return redirect(authorizeUrl(env, tiktokRedirectUri(env), state));
}

async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const fail = (message: string) =>
    redirect(`${frontBase(env)}/#/settings?tt_error=${encodeURIComponent(message)}`);

  const error = url.searchParams.get('error');
  if (error) {
    return fail(url.searchParams.get('error_description') || `TikTok a refusé la connexion (${error}).`);
  }
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return fail('Réponse TikTok incomplète.');

  const saved = await env.DB.prepare('SELECT created_at FROM oauth_states WHERE state = ?')
    .bind(state)
    .first<{ created_at: number }>();
  await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
  if (!saved || saved.created_at < now() - STATE_TTL_MS) {
    return fail('La connexion a expiré, recommence.');
  }

  const secret = requireRenderSecret(env);
  let tokens: TokenResponse;
  try {
    tokens = await exchangeCode(env, code, tiktokRedirectUri(env));
  } catch (err) {
    return fail(err instanceof HttpError ? err.message : "Échec de l'échange avec TikTok.");
  }

  // Verrou propriétaire : seul le premier compte connecté (ou ALLOWED_OPEN_IDS) peut utiliser l'app.
  await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_open_id', ?)")
    .bind(tokens.open_id)
    .run();
  const owner = await env.DB.prepare("SELECT value FROM settings WHERE key = 'owner_open_id'").first<{ value: string }>();
  const extra = (env.ALLOWED_OPEN_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (owner && owner.value !== tokens.open_id && !extra.includes(tokens.open_id)) {
    return fail("Ce site est réservé à un autre compte TikTok. Ajoute ton open_id dans ALLOWED_OPEN_IDS pour l'autoriser.");
  }

  const scopes = (tokens.scope || '').split(',').map((s) => s.trim()).filter(Boolean);
  let displayName = '';
  let username = '';
  let avatarUrl = '';
  try {
    const user = await fetchUser(tokens.access_token, scopes);
    displayName = user.display_name || '';
    username = user.username || '';
    avatarUrl = user.avatar_url || '';
  } catch {
    /* profil optionnel : la connexion reste valide */
  }

  const ts = now();
  await env.DB.prepare(
    `INSERT INTO accounts (open_id, display_name, username, avatar_url, access_token, refresh_token, access_expires_at, refresh_expires_at, scopes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(open_id) DO UPDATE SET
       display_name = excluded.display_name, username = excluded.username, avatar_url = excluded.avatar_url,
       access_token = excluded.access_token, refresh_token = excluded.refresh_token,
       access_expires_at = excluded.access_expires_at, refresh_expires_at = excluded.refresh_expires_at,
       scopes = excluded.scopes, updated_at = excluded.updated_at`,
  )
    .bind(
      tokens.open_id,
      displayName,
      username,
      avatarUrl,
      await encryptText(secret, tokens.access_token),
      await encryptText(secret, tokens.refresh_token),
      ts + tokens.expires_in * 1000,
      ts + tokens.refresh_expires_in * 1000,
      scopes.join(','),
      ts,
      ts,
    )
    .run();

  const sessionToken = randomToken(32);
  await env.DB.prepare('INSERT INTO sessions (token_hash, open_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(sessionToken), tokens.open_id, ts, ts + SESSION_TTL_MS)
    .run();

  return redirect(`${frontBase(env)}/#/settings?tt_session=${encodeURIComponent(sessionToken)}`);
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const { openId } = await requireSession(request, env);
  const account = await env.DB.prepare('SELECT * FROM accounts WHERE open_id = ?').bind(openId).first<AccountRow>();
  if (!account) throw new HttpError(401, 'unauthorized', 'Compte introuvable : reconnecte TikTok.');

  const scopes = account.scopes.split(',').filter(Boolean);
  let live: Awaited<ReturnType<typeof fetchUser>> | null = null;
  try {
    live = await fetchUser(await getValidAccessToken(env, openId), scopes);
  } catch (err) {
    if (err instanceof HttpError && err.code === 'tiktok_reauth') throw err;
  }

  const hasStats = live && typeof live.follower_count === 'number';
  return respond(request, env, {
    openId,
    displayName: live?.display_name || account.display_name,
    username: live?.username || account.username,
    avatarUrl: live?.avatar_url || account.avatar_url,
    scopes,
    canPublish: scopes.includes('video.publish'),
    stats: hasStats
      ? {
          followers: live?.follower_count ?? 0,
          following: live?.following_count ?? 0,
          likes: live?.likes_count ?? 0,
          videos: live?.video_count ?? 0,
        }
      : null,
  });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  }
  return respond(request, env, { ok: true });
}

async function handleDisconnect(request: Request, env: Env): Promise<Response> {
  const { openId } = await requireSession(request, env);
  try {
    await revokeToken(env, await getValidAccessToken(env, openId));
  } catch {
    /* révocation au mieux : on supprime quand même localement */
  }
  await env.DB.prepare('DELETE FROM sessions WHERE open_id = ?').bind(openId).run();
  await env.DB.prepare('DELETE FROM accounts WHERE open_id = ?').bind(openId).run();
  await env.DB.prepare("UPDATE jobs SET status = 'failed', error = 'Compte TikTok déconnecté.', updated_at = ? WHERE open_id = ? AND status = 'scheduled'")
    .bind(now(), openId)
    .run();
  return respond(request, env, { ok: true });
}

async function handleCreatorInfo(request: Request, env: Env): Promise<Response> {
  const { openId } = await requireSession(request, env);
  const info = await queryCreatorInfo(await getValidAccessToken(env, openId));
  return respond(request, env, {
    nickname: info.creator_nickname || '',
    username: info.creator_username || '',
    avatarUrl: info.creator_avatar_url || '',
    privacyLevelOptions: info.privacy_level_options || [],
    commentDisabled: info.comment_disabled === true,
    duetDisabled: info.duet_disabled === true,
    stitchDisabled: info.stitch_disabled === true,
    maxVideoPostDurationSec: info.max_video_post_duration_sec ?? null,
  });
}

// ---------------------------------------------------------------- Pexels

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

async function handlePexelsSearch(request: Request, env: Env): Promise<Response> {
  await requireSession(request, env);
  if (!env.PEXELS_API_KEY) {
    throw new HttpError(503, 'not_configured', 'PEXELS_API_KEY manquante côté serveur (voir SETUP.md).');
  }
  const url = new URL(request.url);
  const query = clampString(url.searchParams.get('query'), 120).trim();
  if (!query) throw new HttpError(400, 'invalid_param', 'Mots-clés manquants.');
  const perPage = Math.min(15, Math.max(1, Number(url.searchParams.get('per_page')) || 8));

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=${perPage}`,
    { headers: { Authorization: env.PEXELS_API_KEY } },
  );
  if (!res.ok) throw new HttpError(502, 'pexels_error', `Pexels a répondu HTTP ${res.status}.`);
  const data = (await res.json()) as { videos?: PexelsVideo[] };

  const videos = (data.videos || []).map((v) => ({
    id: v.id,
    url: v.url,
    image: v.image,
    duration: v.duration,
    width: v.width,
    height: v.height,
    credit: v.user?.name || '',
    files: (v.video_files || [])
      .filter((f) => f.file_type === 'video/mp4' && f.link)
      .map((f) => ({ quality: f.quality || '', width: f.width || 0, height: f.height || 0, link: f.link })),
  }));
  return respond(request, env, { videos });
}

// ---------------------------------------------------------------- jobs

async function handleCreateJob(request: Request, env: Env): Promise<Response> {
  const { openId } = await requireSession(request, env);
  requireRenderSecret(env);
  const params = parseJobParams(await readJson(request));

  const since = now() - 24 * 3600_000;
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM jobs WHERE open_id = ? AND created_at > ?')
    .bind(openId, since)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= MAX_JOBS_PER_DAY) {
    throw new HttpError(429, 'quota', `Limite de ${MAX_JOBS_PER_DAY} vidéos par 24 h atteinte.`);
  }
  const active = await env.DB.prepare("SELECT COUNT(*) AS n FROM jobs WHERE open_id = ? AND status IN ('queued','rendering')")
    .bind(openId)
    .first<{ n: number }>();
  if ((active?.n ?? 0) >= MAX_ACTIVE_JOBS) {
    throw new HttpError(429, 'busy', 'Deux rendus sont déjà en cours : attends qu’un se termine.');
  }

  const id = crypto.randomUUID();
  const ts = now();
  await env.DB.prepare(
    `INSERT INTO jobs (id, open_id, status, step, progress, params, created_at, updated_at)
     VALUES (?, ?, 'queued', 'En attente du serveur de rendu…', 0, ?, ?, ?)`,
  )
    .bind(id, openId, JSON.stringify(params), ts, ts)
    .run();

  try {
    await dispatchWorkflow(env, 'render-video.yml', { job_id: id, api_url: new URL(request.url).origin });
  } catch (err) {
    const message = err instanceof HttpError ? err.message : 'Impossible de lancer le rendu.';
    await env.DB.prepare("UPDATE jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
      .bind(message, now(), id)
      .run();
    throw err;
  }

  const row = await getOwnedJob(env, openId, id);
  return respond(request, env, { job: publicJob(row) }, 201);
}

async function handleListJobs(request: Request, env: Env): Promise<Response> {
  const { openId } = await requireSession(request, env);
  const { results } = await env.DB.prepare('SELECT * FROM jobs WHERE open_id = ? ORDER BY created_at DESC LIMIT 20')
    .bind(openId)
    .all<JobRow>();
  return respond(request, env, { jobs: (results || []).map(publicJob) });
}

async function handleGetJob(request: Request, env: Env, id: string): Promise<Response> {
  const { openId } = await requireSession(request, env);
  return respond(request, env, { job: publicJob(await getOwnedJob(env, openId, id)) });
}

async function savePublish(env: Env, id: string, status: JobStatus, publish: PublishInfo, error: string | null = null) {
  await env.DB.prepare('UPDATE jobs SET status = ?, publish = ?, error = ?, updated_at = ? WHERE id = ?')
    .bind(status, JSON.stringify({ ...publish, updatedAt: now() }), error, now(), id)
    .run();
}

async function handlePublishJob(request: Request, env: Env, id: string): Promise<Response> {
  const { openId } = await requireSession(request, env);
  const job = await getOwnedJob(env, openId, id);
  if (job.status !== 'rendered' || !job.video_url) {
    throw new HttpError(409, 'not_ready', `Cette vidéo n'est pas prête à être publiée (statut : ${job.status}).`);
  }
  const input = parsePublishInput(await readJson(request), now());
  const account = await env.DB.prepare('SELECT username, scopes FROM accounts WHERE open_id = ?')
    .bind(openId)
    .first<{ username: string; scopes: string }>();
  if (!account?.scopes.split(',').includes('video.publish')) {
    throw new HttpError(403, 'scope_missing', "Ton compte n'a pas autorisé la publication (scope video.publish). Reconnecte TikTok.");
  }

  const apiUrl = new URL(request.url).origin;
  const publish: PublishInfo = {
    caption: input.caption,
    privacy: input.privacy,
    disableComment: input.disableComment,
    disableDuet: input.disableDuet,
    disableStitch: input.disableStitch,
    brandContent: input.brandContent,
    brandOrganic: input.brandOrganic,
    isAigc: input.isAigc,
    publishAt: input.publishAt ?? undefined,
    apiUrl,
    username: account.username || undefined,
    error: null,
  };

  if (input.publishAt) {
    await savePublish(env, id, 'scheduled', publish);
  } else {
    await savePublish(env, id, 'publishing', publish);
    try {
      await dispatchWorkflow(env, 'publish-tiktok.yml', { job_id: id, api_url: apiUrl });
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Impossible de lancer la publication.';
      await savePublish(env, id, 'rendered', { ...publish, error: message });
      throw err;
    }
  }
  return respond(request, env, { job: publicJob(await getOwnedJob(env, openId, id)) });
}

async function handleCancelSchedule(request: Request, env: Env, id: string): Promise<Response> {
  const { openId } = await requireSession(request, env);
  const job = await getOwnedJob(env, openId, id);
  if (job.status !== 'scheduled') throw new HttpError(409, 'not_scheduled', "Cette vidéo n'est pas programmée.");
  const publish = parseJson<PublishInfo>(job.publish, {});
  await savePublish(env, id, 'rendered', { ...publish, publishAt: undefined, error: null });
  return respond(request, env, { job: publicJob(await getOwnedJob(env, openId, id)) });
}

// ---------------------------------------------------------------- routes internes (GitHub Actions)

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

async function handleInternalToken(request: Request, env: Env, id: string): Promise<Response> {
  await requireInternal(request, env);
  const row = await getJobById(env, id);
  const accessToken = await getValidAccessToken(env, row.open_id);
  return respond(request, env, { accessToken });
}

// ---------------------------------------------------------------- santé & cron

async function handleHealth(request: Request, env: Env): Promise<Response> {
  let db = false;
  try {
    await env.DB.prepare('SELECT 1 FROM jobs LIMIT 1').first();
    db = true;
  } catch {
    db = false;
  }
  return respond(request, env, {
    ok: true,
    db,
    configured: {
      tiktok: Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),
      github: Boolean(env.GH_DISPATCH_TOKEN),
      render: Boolean(env.RENDER_SECRET && env.RENDER_SECRET.length >= 16),
      pexels: Boolean(env.PEXELS_API_KEY),
    },
    scopes: (env.TIKTOK_SCOPES || '').split(',').filter(Boolean),
  });
}

async function runCron(env: Env): Promise<void> {
  const ts = now();

  // 1. Publications programmées arrivées à échéance
  const due = await env.DB.prepare("SELECT * FROM jobs WHERE status = 'scheduled' LIMIT 20").all<JobRow>();
  for (const job of due.results || []) {
    const publish = parseJson<PublishInfo>(job.publish, {});
    if (!publish.publishAt || publish.publishAt > ts) continue;
    if (!publish.apiUrl) {
      await savePublish(env, job.id, 'rendered', { ...publish, error: 'URL du serveur inconnue pour la publication programmée.' });
      continue;
    }
    await savePublish(env, job.id, 'publishing', { ...publish, error: null });
    try {
      await dispatchWorkflow(env, 'publish-tiktok.yml', { job_id: job.id, api_url: publish.apiUrl });
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Impossible de lancer la publication.';
      await savePublish(env, job.id, 'rendered', { ...publish, error: message });
    }
  }

  // 2. Rendus bloqués
  await env.DB.prepare(
    "UPDATE jobs SET status = 'failed', error = 'Le rendu a dépassé le délai maximum (35 min).', updated_at = ? WHERE status IN ('queued','rendering') AND updated_at < ?",
  )
    .bind(ts, ts - STUCK_RENDER_MS)
    .run();

  // 3. Publications bloquées : retour à l'état "prêt" pour pouvoir réessayer
  const stuck = await env.DB.prepare("SELECT * FROM jobs WHERE status = 'publishing' AND updated_at < ? LIMIT 20")
    .bind(ts - STUCK_PUBLISH_MS)
    .all<JobRow>();
  for (const job of stuck.results || []) {
    const publish = parseJson<PublishInfo>(job.publish, {});
    await savePublish(env, job.id, 'rendered', {
      ...publish,
      error: 'La publication a dépassé le délai maximum : vérifie ton compte TikTok avant de réessayer.',
    });
  }

  // 4. Ménage
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(ts).run();
  await env.DB.prepare('DELETE FROM oauth_states WHERE created_at < ?').bind(ts - STATE_TTL_MS).run();
}

// ---------------------------------------------------------------- routeur

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (method === 'GET' && (path === '/' || path === '/health')) return handleHealth(request, env);
  if (method === 'GET' && path === '/auth/tiktok/start') return handleAuthStart(request, env);
  if (method === 'GET' && path === '/auth/tiktok/callback') return handleAuthCallback(request, env);
  if (method === 'POST' && path === '/auth/logout') return handleLogout(request, env);
  if (method === 'POST' && path === '/auth/disconnect') return handleDisconnect(request, env);
  if (method === 'GET' && path === '/me') return handleMe(request, env);
  if (method === 'GET' && path === '/tiktok/creator-info') return handleCreatorInfo(request, env);
  if (method === 'GET' && path === '/pexels/search') return handlePexelsSearch(request, env);

  if (method === 'POST' && path === '/jobs') return handleCreateJob(request, env);
  if (method === 'GET' && path === '/jobs') return handleListJobs(request, env);

  let m = path.match(/^\/jobs\/([0-9a-f-]{36})$/);
  if (m && method === 'GET') return handleGetJob(request, env, m[1]);
  m = path.match(/^\/jobs\/([0-9a-f-]{36})\/publish$/);
  if (m && method === 'POST') return handlePublishJob(request, env, m[1]);
  m = path.match(/^\/jobs\/([0-9a-f-]{36})\/cancel-schedule$/);
  if (m && method === 'POST') return handleCancelSchedule(request, env, m[1]);

  m = path.match(/^\/internal\/jobs\/([0-9a-f-]{36})$/);
  if (m && method === 'GET') return handleInternalGetJob(request, env, m[1]);
  if (m && method === 'POST') return handleInternalPatchJob(request, env, m[1]);
  m = path.match(/^\/internal\/jobs\/([0-9a-f-]{36})\/token$/);
  if (m && method === 'GET') return handleInternalToken(request, env, m[1]);

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

