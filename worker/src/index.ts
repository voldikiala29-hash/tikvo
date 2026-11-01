import { dispatchWorkflow } from './github';
import { requireFirebaseUser, searchStockVideos } from './pexels';
import { createRender, getRender, listDayRenders, parseRenderInput } from './renders';
import { callModel, generateNicheScripts, rewriteScript, AI_MODEL, runWorkersAi, textModels } from './scripts';
import { ANALYZE_MODEL, TTS_MODEL, dedupe, extractWorkersAiText } from './aiModels';
import { synthesizeSpeech } from './speech';
import { KEYWORDS_SYSTEM, keywordsPrompt, parseKeywords } from './keywords';
import { improveScript } from './improve';
import { generateStory, suggestSubjects } from './storyGen';
import { STORY_MODES, type StoryRequest } from './story';
import { BRIEF_SYSTEM, buildBriefPrompt, parseBriefPlan } from './briefs';
import { addUserMedia, cleanDescription, deleteUserMedia, listUserMedia, mediaFileForPipeline, mediaForJob, publicMedia, updateUserMedia, userMediaFile } from './media';
import { fetchPublicMetadata, parseSourceUrl } from './inspiration';
import { cleanScriptText, ScriptItem } from './scriptParse';
import { resolveRenderSettings } from './renderSettings';
import { parseScriptRequest } from './scriptParse';
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
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
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

/** Une requête de recherche de plan par phrase du script (appelé par le pipeline de rendu). */
async function handleMediaList(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const rows = await listUserMedia(env, user.uid);
  return respond(request, env, { media: rows.map(publicMedia) });
}

async function handleMediaUpload(request: Request, env: Env, url: URL): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const mime = request.headers.get('Content-Type') || '';
  const data = await request.arrayBuffer();
  const row = await addUserMedia(env, user.uid, mime, cleanDescription(url.searchParams.get('description')), data);
  return respond(request, env, { media: publicMedia(row) }, 201);
}

async function handleMediaUpdate(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  await updateUserMedia(env, user.uid, id, cleanDescription(body.description));
  return respond(request, env, { ok: true });
}

async function handleMediaDelete(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  await deleteUserMedia(env, user.uid, id);
  return respond(request, env, { ok: true });
}

async function handleMediaFile(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const file = await userMediaFile(env, user.uid, id);
  const headers = new Headers(file.headers);
  for (const [k, v] of Object.entries(corsHeaders(request, env))) headers.set(k, v);
  return new Response(file.body, { headers });
}

async function handleInternalMedia(request: Request, env: Env, id: string): Promise<Response> {
  await requireInternal(request, env);
  return mediaFileForPipeline(env, id);
}

/** Script amélioré pour le rendu (appel interne). Renvoie le script d'origine si l'amélioration échoue. */
async function handleInternalImproveScript(request: Request, env: Env): Promise<Response> {
  await requireInternal(request, env);
  const body = await readJson(request);
  const script = typeof body.script === 'string' ? body.script.trim().slice(0, 1500) : '';
  if (script.length < 10) throw new HttpError(400, 'invalid_param', 'Script trop court.');
  const niche = typeof body.niche === 'string' && /^[a-z]{2,20}$/.test(body.niche) ? body.niche : 'general';
  return respond(request, env, await improveScript(env, script, niche));
}

async function handleInternalBriefs(request: Request, env: Env): Promise<Response> {
  await requireInternal(request, env);
  const body = await readJson(request);
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.slice(0, 300))
    .slice(0, 8);
  if (lines.length === 0) throw new HttpError(400, 'invalid_param', 'Aucune phrase à illustrer.');
  const niche = typeof body.niche === 'string' && /^[a-z]{2,20}$/.test(body.niche) ? body.niche : 'general';
  const script = typeof body.script === 'string' ? body.script.replace(/\s+/g, ' ').trim().slice(0, 1500) : '';
  const media = (Array.isArray(body.media) ? body.media : [])
    .filter((m): m is { id: string; description: string } => !!m && typeof (m as { id?: unknown }).id === 'string')
    .map((m) => ({ id: m.id, description: cleanDescription(m.description) }))
    .filter((m) => /^[0-9a-f-]{36}$/.test(m.id))
    .slice(0, 40);
  let plan: { queries: (string | null)[]; mediaIds: (string | null)[] };
  try {
    const raw = await callModel(env, buildBriefPrompt(lines, niche, media, script), 300 + lines.length * 60, BRIEF_SYSTEM);
    plan = parseBriefPlan(raw, lines.length, media.map((m) => m.id));
  } catch (err) {
    console.warn('Plans par phrase indisponibles :', err instanceof Error ? err.message : err);
    plan = { queries: lines.map(() => null), mediaIds: lines.map(() => null) };
  }
  return respond(request, env, plan);
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

/**
 * Recherche stock à partir d'un script : { script, q?, per_page? }.
 * Le modèle extrait 3 mots-clés visuels en anglais ; chacun cherche 3 vidéos sur Pixabay.
 * Sans script : recherche simple sur q. Si le modèle ne répond pas : fallback=true, le client garde sa logique par niche.
 */
async function handleStockSearchFromScript(request: Request, env: Env): Promise<Response> {
  await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const q = typeof body.q === 'string' ? body.q.trim().slice(0, 100) : '';
  const script = typeof body.script === 'string' ? body.script.replace(/\s+/g, ' ').trim().slice(0, 1500) : '';
  const perPage = Math.min(10, Math.max(3, Number(body.per_page) || 3));
  if (script.length < 10) {
    if (!q) throw new HttpError(400, 'invalid_param', 'Indique un script ou une recherche (q).');
    return respond(request, env, { videos: await searchStockVideos(env, q, perPage) });
  }
  let keywords: string[] = [];
  try {
    keywords = parseKeywords(await callModel(env, keywordsPrompt(script), 200, KEYWORDS_SYSTEM));
  } catch (err) {
    console.warn('Mots-clés indisponibles :', err instanceof Error ? err.message : err);
  }
  if (keywords.length === 0) return respond(request, env, { keywords: [], results: [], fallback: true });
  const results = await Promise.all(
    keywords.map(async (keyword) => ({
      keyword,
      videos: await searchStockVideos(env, keyword, perPage).catch(() => []),
    })),
  );
  return respond(request, env, { keywords, results, fallback: false });
}

async function handleGenerateScripts(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const brief = await loadBrief(env, user.uid);
  const body = await readJson(request);
  let parsed: { niches: string[]; duration: number };
  try {
    parsed = parseScriptRequest(body);
  } catch (err) {
    throw new HttpError(400, 'invalid_param', err instanceof Error ? err.message : 'Requête invalide.');
  }
  const perNiche = Math.ceil(parsed.duration / parsed.niches.length);
  // Une niche après l'autre : jamais de rafale d'appels, pour rester dans le quota.
  const lists: ScriptItem[][] = [];
  for (const niche of parsed.niches) {
    lists.push(await generateNicheScripts(env, niche, perNiche, brief));
  }
  const scripts = Object.fromEntries(parsed.niches.map((n, i) => [n, lists[i]]));
  return respond(request, env, { scripts, requested: parsed.duration, model: AI_MODEL });
}

/** Résumé de style de l'utilisateur (vide si aucune source analysée). */
async function loadBrief(env: Env, uid: string): Promise<string | null> {
  // Le style est facultatif : une erreur de lecture ne doit jamais bloquer la génération.
  try {
    const row = await env.DB.prepare('SELECT brief FROM style_briefs WHERE uid = ?').bind(uid).first<{ brief: string }>();
    return row?.brief ?? null;
  } catch (err) {
    console.warn('[style] lecture du style impossible', err instanceof Error ? err.message : String(err));
    return null;
  }
}

const MAX_SOURCES = 20;
const NOTES_MAX = 2000;

async function handleListInspiration(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const rows = await env.DB.prepare(
    'SELECT id, url, platform, title, author, notes, created_at FROM inspiration_sources WHERE uid = ? ORDER BY created_at DESC LIMIT 50',
  )
    .bind(user.uid)
    .all<{ id: string; url: string; platform: string; title: string | null; author: string | null; notes: string; created_at: number }>();
  const sources = (rows.results ?? []).map((r) => ({
    id: r.id,
    url: r.url,
    platform: r.platform,
    title: r.title,
    author: r.author,
    notes: r.notes,
    createdAt: r.created_at,
  }));
  return respond(request, env, { sources, brief: await loadBrief(env, user.uid) });
}

async function handleAddInspiration(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const { url, platform } = parseSourceUrl(body.url);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM inspiration_sources WHERE uid = ?')
    .bind(user.uid)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_SOURCES) throw new HttpError(400, 'limit', `Maximum ${MAX_SOURCES} sources.`);

  const existing = await env.DB.prepare('SELECT id FROM inspiration_sources WHERE uid = ? AND url = ?')
    .bind(user.uid, url)
    .first<{ id: string }>();
  if (existing) throw new HttpError(409, 'duplicate', 'Cette source est déjà dans ta liste.');

  const meta = await fetchPublicMetadata(platform, url);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO inspiration_sources (id, uid, url, platform, title, author, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, user.uid, url, platform, meta.title, meta.author, '', Date.now())
    .run();
  return respond(request, env, { source: { id, url, platform, title: meta.title, author: meta.author, notes: '', createdAt: Date.now() } }, 201);
}

async function handleUpdateInspiration(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  if (notes === null || notes.length > NOTES_MAX) throw new HttpError(400, 'invalid_param', `Texte trop long (${NOTES_MAX} caractères max).`);
  const result = await env.DB.prepare('UPDATE inspiration_sources SET notes = ? WHERE id = ? AND uid = ?')
    .bind(notes, id, user.uid)
    .run();
  if (!result.meta?.changes) throw new HttpError(404, 'not_found', 'Source introuvable.');
  return respond(request, env, { ok: true });
}

async function handleDeleteInspiration(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  await env.DB.prepare('DELETE FROM inspiration_sources WHERE id = ? AND uid = ?').bind(id, user.uid).run();
  return respond(request, env, { ok: true });
}

/** Llama résume le style commun des sources (titres, auteurs, textes collés) en quelques lignes. */
/**
 * Diagnostic des modèles gratuits : texte (chaque modèle de AI_TEXT_MODELS) et voix (MeloTTS).
 * Réservé aux comptes connectés pour éviter une consommation de quota par des tiers.
 */
async function handleTestAi(request: Request, env: Env): Promise<Response> {
  await requireFirebaseUser(request, env);
  const results: Record<string, unknown>[] = [];
  for (const model of textModels(env)) {
    const started = Date.now();
    try {
      const out = await runWorkersAi(env, model, { messages: [{ role: 'user', content: 'Réponds seulement : OK' }], max_tokens: 20 });
      const sample = extractWorkersAiText(out).slice(0, 80);
      const row = { kind: 'texte', model, ok: sample.trim().length > 0, ms: Date.now() - started, sample };
      console.log('[test-ai]', row);
      results.push(row);
    } catch (err) {
      const row = { kind: 'texte', model, ok: false, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
      console.warn('[test-ai]', row);
      results.push(row);
    }
  }
  const started = Date.now();
  try {
    const audio = await synthesizeSpeech(env, 'Bonjour, ceci est un test de voix.', 'fr', null);
    const row = { kind: 'voix', model: TTS_MODEL, ok: true, ms: Date.now() - started, bytes: audio.byteLength };
    console.log('[test-ai]', row);
    results.push(row);
  } catch (err) {
    const row = { kind: 'voix', model: TTS_MODEL, ok: false, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
    console.warn('[test-ai]', row);
    results.push(row);
  }
  return respond(request, env, { results });
}

/** Voix off pour le rendu (appel interne, secret de rendu). Renvoie le MP3 directement. */
async function handleStorySubjects(request: Request, env: Env): Promise<Response> {
  await requireFirebaseUser(request, env);
  return respond(request, env, { subjects: await suggestSubjects(env) });
}

/** Histoire à partir d'un sujet (choisi ou écrit) ou d'un script fourni, dans le mode demandé. */
async function handleStory(request: Request, env: Env): Promise<Response> {
  await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const source = body.source === 'script' ? 'script' : 'topic';
  const mode = STORY_MODES.find((m) => m === body.mode);
  if (!mode) throw new HttpError(400, 'invalid_param', 'Mode inconnu : narrator, dialogue ou both.');
  const topic = typeof body.topic === 'string' ? body.topic.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
  const script = typeof body.script === 'string' ? body.script.trim().slice(0, 1500) : '';
  if (source === 'topic' && topic.length < 5) throw new HttpError(400, 'invalid_param', 'Donne un sujet (au moins 5 caractères).');
  if (source === 'script' && script.length < 10) throw new HttpError(400, 'invalid_param', 'Donne un script (au moins 10 caractères).');
  const req: StoryRequest = { source, topic, script, mode };
  return respond(request, env, { story: await generateStory(env, req) });
}

async function handleTtsFree(request: Request, env: Env): Promise<Response> {
  await requireInternal(request, env);
  const body = await readJson(request);
  const text = typeof body.text === 'string' ? body.text : '';
  const lang = typeof body.lang === 'string' && /^[a-z]{2}$/.test(body.lang) ? body.lang : 'fr';
  const jobId = typeof body.jobId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.jobId) ? body.jobId : null;
  const audio = await synthesizeSpeech(env, text, lang, jobId);
  return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'X-Voice-Engine': 'melotts' } });
}

async function handleAnalyzeInspiration(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const rows = await env.DB.prepare('SELECT platform, title, author, notes FROM inspiration_sources WHERE uid = ? LIMIT 20')
    .bind(user.uid)
    .all<{ platform: string; title: string | null; author: string | null; notes: string }>();
  const sources = rows.results ?? [];
  if (sources.length === 0) throw new HttpError(400, 'no_sources', 'Ajoute au moins une source avant l’analyse.');

  const described = sources
    .map((s, i) => {
      const parts = [s.title ? `titre : ${s.title}` : null, s.author ? `auteur : ${s.author}` : null, s.notes ? `texte : ${s.notes}` : null];
      return `${i + 1}. ${s.platform}${parts.filter(Boolean).length ? ' — ' + parts.filter(Boolean).join(' ; ') : ' — (aucune information lisible, à déduire du lien)'}`;
    })
    .join('\n');
  const prompt = [
    'Voici des vidéos ou pages que l’utilisateur veut imiter :',
    described,
    '',
    'Décris en 5 lignes maximum le style commun : type d’accroche, longueur des phrases, ton, structure du script, sujets récurrents.',
    'Réponds uniquement avec ces lignes, en français.',
  ].join('\n');
  // Modèle rapide d'abord, puis les modèles de texte en secours.
  const raw = await callModel(env, prompt, 500, 'Tu es un analyste de contenus vidéo. Tu réponds de façon concise.', dedupe([ANALYZE_MODEL, ...textModels(env)]));
  const brief = cleanScriptText(raw).slice(0, 800);
  if (brief.length < 20) throw new HttpError(502, 'analysis_failed', 'L’analyse n’a rien donné. Réessaie.');

  await env.DB.prepare(
    'INSERT INTO style_briefs (uid, brief, updated_at) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET brief = excluded.brief, updated_at = excluded.updated_at',
  )
    .bind(user.uid, brief, Date.now())
    .run();
  return respond(request, env, { brief });
}

async function handleRewriteScript(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const script = typeof body.script === 'string' ? body.script.trim() : '';
  if (script.length < 10 || script.length > 1500) throw new HttpError(400, 'invalid_param', 'Script invalide.');
  const seconds = Number(body.targetSeconds);
  if (!Number.isFinite(seconds) || seconds < 10 || seconds > 90) {
    throw new HttpError(400, 'invalid_param', 'Durée cible invalide (10 à 90 s).');
  }
  const text = await rewriteScript(env, script, Math.round(seconds), await loadBrief(env, user.uid));
  return respond(request, env, { script: text, targetSeconds: Math.round(seconds), model: AI_MODEL });
}

async function handleGetSettings(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const row = await env.DB.prepare('SELECT settings FROM user_settings WHERE uid = ?').bind(user.uid).first<{ settings: string }>();
  let raw: unknown = null;
  try {
    raw = row ? JSON.parse(row.settings) : null;
  } catch {
    raw = null;
  }
  return respond(request, env, { settings: resolveRenderSettings(raw), saved: row !== null && raw !== null });
}

async function handlePutSettings(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const settings = resolveRenderSettings(body.settings);
  await env.DB.prepare(
    `INSERT INTO user_settings (uid, settings, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`,
  )
    .bind(user.uid, JSON.stringify(settings), Date.now())
    .run();
  return respond(request, env, { settings });
}

const OVERRIDE_KEY = /^[A-Za-z0-9_-]{1,80}\|\d{4}-\d{2}-\d{2}\|\d{1,2}$/;

async function handleGetOverrides(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const rows = await env.DB.prepare('SELECT key, script FROM script_overrides WHERE uid = ? LIMIT 1000')
    .bind(user.uid)
    .all<{ key: string; script: string }>();
  const overrides = Object.fromEntries((rows.results ?? []).map((r) => [r.key, r.script]));
  return respond(request, env, { overrides });
}

async function handlePutOverride(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const key = typeof body.key === 'string' ? body.key : '';
  const script = typeof body.script === 'string' ? body.script.trim() : '';
  if (!OVERRIDE_KEY.test(key)) throw new HttpError(400, 'invalid_param', 'Clé de script invalide.');
  if (script.length < 10 || script.length > 1500) throw new HttpError(400, 'invalid_param', 'Script invalide.');
  await env.DB.prepare(
    `INSERT INTO script_overrides (uid, key, script, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(uid, key) DO UPDATE SET script = excluded.script, updated_at = excluded.updated_at`,
  )
    .bind(user.uid, key, script, Date.now())
    .run();
  return respond(request, env, { ok: true });
}

async function handleRenderCreate(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const body = await readJson(request);
  const input = parseRenderInput(body);
  // Médias de l'utilisateur : le pipeline choisit ceux qui montrent la phrase.
  input.media = mediaForJob(await listUserMedia(env, user.uid));
  const apiUrl = new URL(request.url).origin;
  const job = await createRender(env, user.uid, input, apiUrl, body.force === true);
  return respond(request, env, { job }, 202);
}

async function handleRendersList(request: Request, env: Env): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const day = new URL(request.url).searchParams.get('day') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new HttpError(400, 'invalid_param', 'Paramètre day invalide.');
  return respond(request, env, { jobs: await listDayRenders(env, user.uid, day) });
}

async function handleRenderGet(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireFirebaseUser(request, env);
  const job = await getRender(env, user.uid, id);
  if (!job) throw new HttpError(404, 'not_found', 'Rendu introuvable.');
  return respond(request, env, { job });
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
  if (method === 'POST' && path === '/api/pexels/search') return handleStockSearchFromScript(request, env);
  if (method === 'POST' && path === '/api/render') return handleRenderCreate(request, env);
  if (method === 'POST' && path === '/api/generate-scripts') return handleGenerateScripts(request, env);
  if (method === 'POST' && path === '/api/rewrite-script') return handleRewriteScript(request, env);
  if (path === '/api/inspiration' && method === 'GET') return handleListInspiration(request, env);
  if (path === '/api/inspiration' && method === 'POST') return handleAddInspiration(request, env);
  if (path === '/api/inspiration/analyze' && method === 'POST') return handleAnalyzeInspiration(request, env);
  if (path === '/api/analyze-style' && method === 'POST') return handleAnalyzeInspiration(request, env);
  if (path === '/api/story/subjects' && method === 'GET') return handleStorySubjects(request, env);
  if (path === '/api/story' && method === 'POST') return handleStory(request, env);
  if (path === '/api/test-ai' && method === 'GET') return handleTestAi(request, env);
  if (path === '/api/tts-free' && method === 'POST') return handleTtsFree(request, env);
  const inspirationId = path.match(/^\/api\/inspiration\/([0-9a-f-]{36})$/);
  if (inspirationId && method === 'PUT') return handleUpdateInspiration(request, env, inspirationId[1]);
  if (inspirationId && method === 'DELETE') return handleDeleteInspiration(request, env, inspirationId[1]);
  if (path === '/api/settings' && method === 'GET') return handleGetSettings(request, env);
  if (path === '/api/settings' && method === 'PUT') return handlePutSettings(request, env);
  if (path === '/api/script-overrides' && method === 'GET') return handleGetOverrides(request, env);
  if (path === '/api/script-override' && method === 'PUT') return handlePutOverride(request, env);
  if (path === '/internal/briefs' && method === 'POST') return handleInternalBriefs(request, env);
  if (path === '/internal/improve-script' && method === 'POST') return handleInternalImproveScript(request, env);
  if (path === '/api/media' && method === 'GET') return handleMediaList(request, env);
  if (path === '/api/media' && method === 'POST') return handleMediaUpload(request, env, url);
  const mediaMatch = path.match(/^\/api\/media\/([0-9a-f-]{36})(\/file)?$/);
  if (mediaMatch && method === 'PUT' && !mediaMatch[2]) return handleMediaUpdate(request, env, mediaMatch[1]);
  if (mediaMatch && method === 'DELETE' && !mediaMatch[2]) return handleMediaDelete(request, env, mediaMatch[1]);
  if (mediaMatch && method === 'GET' && mediaMatch[2]) return handleMediaFile(request, env, mediaMatch[1]);
  const internalMedia = path.match(/^\/internal\/media\/([0-9a-f-]{36})$/);
  if (internalMedia && method === 'GET') return handleInternalMedia(request, env, internalMedia[1]);
  if (method === 'GET' && path === '/api/jobs') return handleRendersList(request, env);
  const jobMatch = path.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
  if (jobMatch && method === 'GET') return handleRenderGet(request, env, jobMatch[1]);
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

