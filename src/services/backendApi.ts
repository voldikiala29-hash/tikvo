// Client HTTP du site vers le Worker tikvo (Cloudflare).
// Le navigateur ne voit aucun secret : les clés (Pexels, rendu) restent côté serveur.

export const API_BASE: string = (
  (import.meta.env.VITE_API_URL as string | undefined) || ''
).replace(/\/+$/, '');

export function isApiConfigured(): boolean {
  return API_BASE.length > 0;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré (VITE_API_URL manquant au build).");
  }
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method || 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur tikvo. Vérifie ta connexion.');
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'error', data.message || `Erreur serveur (${res.status}).`);
  }
  return data as T;
}

import { auth } from './firebase';

// ---------------------------------------------------------------- types

export type JobStatus = 'queued' | 'rendering' | 'rendered' | 'failed';

export interface JobView {
  id: string;
  status: JobStatus;
  step: string;
  progress: number;
  params: { niche: { id: string; name: string } | null; hook: string; voice: string };
  videoUrl: string | null;
  videoBytes: number | null;
  durationSec: number | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateJobInput {
  niche: { id: string; name: string };
  hook: string;
  script: string;
  keywords: string[];
  voice: string;
  pexelsIds: number[];
}

export interface PexelsFileView {
  quality: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideoView {
  id: number;
  url: string;
  image: string;
  duration: number;
  width: number;
  height: number;
  credit: string;
  files: PexelsFileView[];
}

export interface PexelsPreviewItem {
  id: number;
  url: string;
  preview: string;
  duration?: number;
  width?: number;
  height?: number;
}

/** Cherche des clips verticaux Pexels via le Worker, avec le jeton Firebase de l'utilisateur. */
export async function searchPexels(query: string, perPage = 3): Promise<PexelsPreviewItem[]> {
  if (!isApiConfigured()) {
    throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré (VITE_API_URL manquant au build).");
  }
  const user = auth?.currentUser;
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connecte-toi pour charger les aperçus.');
  const token = await user.getIdToken();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/pexels/search?q=${encodeURIComponent(query)}&per_page=${perPage}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur tikvo.');
  }
  const data = (await res.json().catch(() => ({}))) as { videos?: PexelsPreviewItem[]; error?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, data.error || 'error', data.message || `Erreur serveur (${res.status}).`);
  return data.videos ?? [];
}

// ---------------------------------------------------------------- rendus MP4

import type { RenderSettings } from '../video-engine/montage';
export type RenderStatus = 'queued' | 'rendering' | 'rendered' | 'failed';

export interface RenderJob {
  id: string;
  status: RenderStatus;
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

export interface RenderRequest {
  title: string;
  hook: string;
  pexelsQuery: string;
  nicheId: string;
  nicheName: string;
  day: string;
  videoKey: string;
  /** Script final (éventuellement modifié) : c'est lui qui fixe la durée. */
  script: string;
  settings: RenderSettings;
  /** Recréation : ignore le rendu existant et prend d'autres clips. */
  force?: boolean;
  variant?: number;
  /** Plans voulus, dans l'ordre (facultatif). */
  storyboard?: { text: string; seconds: number | null }[];
  /** Style : plans Pixabay (défaut) ou dessin animé. */
  style?: 'stock' | 'cartoon';
  /** Personnage principal du dessin animé (identifiant du catalogue). */
  mainCharacter?: string;
  /** Histoire en dessin animé (héros, scènes, répliques) : remplace le script pour le montage. */
  story?: import('../video-engine/story').Story;
}

/** Appel authentifié (jeton Firebase de l'utilisateur) vers le Worker. */
async function authedCall<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré (VITE_API_URL manquant au build).");
  }
  const user = auth?.currentUser;
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connecte-toi pour continuer.');
  const token = await user.getIdToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method || 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur tikvo. Vérifie ta connexion.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, data.error || 'error', data.message || `Erreur serveur (${res.status}).`);
  return data as T;
}

/** Lance le rendu MP4 d'une vidéo du jour. Renvoie le rendu actif s'il en existe déjà un. */
export async function createRender(input: RenderRequest): Promise<RenderJob> {
  return (await authedCall<{ job: RenderJob }>('/api/render', { method: 'POST', body: input })).job;
}

export async function getRender(id: string): Promise<RenderJob> {
  return (await authedCall<{ job: RenderJob }>(`/api/jobs/${encodeURIComponent(id)}`)).job;
}

/** Tous les rendus de l'utilisateur pour un jour (AAAA-MM-JJ), du plus récent au plus ancien. */
export async function listDayRenders(day: string): Promise<RenderJob[]> {
  return (await authedCall<{ jobs: RenderJob[] }>(`/api/jobs?day=${encodeURIComponent(day)}`)).jobs;
}

export interface ScriptItem {
  hook: string;
  phrase1: string;
  phrase2: string;
  cta: string;
  pexelsQuery: string;
}

/** Scripts écrits par Meta Llama (Workers AI) pour les niches choisies. Vide si l'IA est indisponible. */
export async function generateScripts(
  niches: string[],
  duration: number,
): Promise<{ scripts: Record<string, ScriptItem[]>; model?: string }> {
  return authedCall<{ scripts: Record<string, ScriptItem[]>; model?: string }>('/api/generate-scripts', {
    method: 'POST',
    body: { niches, duration },
  });
}

/** Réglages de rendu de l'utilisateur (format, style, nombre de plans). */
/** `saved` : vrai si l'utilisateur a déjà enregistré ses réglages côté serveur. */
export async function getRenderSettings(): Promise<{ settings: RenderSettings; saved: boolean }> {
  return authedCall<{ settings: RenderSettings; saved: boolean }>('/api/settings');
}

export async function saveRenderSettings(settings: RenderSettings): Promise<RenderSettings> {
  return (await authedCall<{ settings: RenderSettings }>('/api/settings', { method: 'PUT', body: { settings } })).settings;
}

/** Scripts modifiés par l'utilisateur, indexés par clé « programme|jour|index ». */
export async function getScriptOverrides(): Promise<Record<string, string>> {
  return (await authedCall<{ overrides: Record<string, string> }>('/api/script-overrides')).overrides;
}

export async function saveScriptOverride(key: string, script: string): Promise<void> {
  await authedCall<{ ok: boolean }>('/api/script-override', { method: 'PUT', body: { key, script } });
}

/** Réécrit un script par Meta Llama pour qu'il dure environ `targetSeconds`. */
export async function rewriteScript(script: string, targetSeconds: number): Promise<string> {
  return (await authedCall<{ script: string }>('/api/rewrite-script', { method: 'POST', body: { script, targetSeconds } })).script;
}

// ---------------------------------------------------------------- appels

export const backend = {
  pexelsSearch: async (query: string, perPage = 8): Promise<{ videos: PexelsVideoView[] }> => {
    const items = await searchPexels(query, perPage);
    return {
      videos: items.map((v) => ({
        id: v.id,
        url: v.url,
        image: v.preview,
        duration: v.duration ?? 0,
        width: v.width ?? 1080,
        height: v.height ?? 1920,
        credit: 'Pexels',
        files: [{ quality: 'hd', width: v.width ?? 1080, height: v.height ?? 1920, link: v.url }],
      })),
    };
  },
  async createJob(input: CreateJobInput): Promise<JobView> {
    return (await call<{ job: JobView }>('/jobs', { method: 'POST', body: input })).job;
  },
  async getJob(id: string): Promise<JobView> {
    return (await call<{ job: JobView }>(`/jobs/${id}`)).job;
  },
};

// ---------------------------------------------------------------- sources d'inspiration

export interface InspirationSource {
  id: string;
  url: string;
  platform: 'tiktok' | 'youtube' | 'facebook';
  title: string | null;
  author: string | null;
  /** Texte collé par l'utilisateur (description, script) : indispensable pour Facebook. */
  notes: string;
  createdAt: number;
}

export async function listInspiration(): Promise<{ sources: InspirationSource[]; brief: string | null }> {
  return authedCall<{ sources: InspirationSource[]; brief: string | null }>('/api/inspiration');
}

export async function addInspiration(url: string): Promise<InspirationSource> {
  return (await authedCall<{ source: InspirationSource }>('/api/inspiration', { method: 'POST', body: { url } })).source;
}

export async function updateInspirationNotes(id: string, notes: string): Promise<void> {
  await authedCall<{ ok: boolean }>(`/api/inspiration/${encodeURIComponent(id)}`, { method: 'PUT', body: { notes } });
}

export async function deleteInspiration(id: string): Promise<void> {
  await authedCall<{ ok: boolean }>(`/api/inspiration/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Llama résume le style commun des sources. */
export async function analyzeInspiration(): Promise<string> {
  return (await authedCall<{ brief: string }>('/api/inspiration/analyze', { method: 'POST' })).brief;
}


// ---- Photos et vidéos personnelles ----

export interface UserMedia {
  id: string;
  kind: 'image' | 'video';
  mime: string;
  bytes: number;
  description: string;
  createdAt: number;
}

export async function listMedia(): Promise<UserMedia[]> {
  return (await authedCall<{ media: UserMedia[] }>('/api/media')).media;
}

/** Envoi d'un fichier brut (photo ou vidéo) avec sa description. */
export async function uploadMedia(file: File, description: string): Promise<UserMedia> {
  if (!isApiConfigured()) throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré.");
  const user = auth?.currentUser;
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connecte-toi pour continuer.');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/media?description=${encodeURIComponent(description)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
      body: file,
    });
  } catch {
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur tikvo. Vérifie ta connexion.');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; media?: UserMedia };
  if (!res.ok || !data.media) throw new ApiError(res.status, data.error || 'error', data.message || `Envoi impossible (${res.status}).`);
  return data.media;
}

export async function updateMedia(id: string, description: string): Promise<void> {
  await authedCall('/api/media/' + encodeURIComponent(id), { method: 'PUT', body: { description } });
}

export async function deleteMedia(id: string): Promise<void> {
  await authedCall('/api/media/' + encodeURIComponent(id), { method: 'DELETE' });
}

/** Adresse locale d'un média (le fichier est chargé avec le jeton, jamais publié). */
export async function mediaObjectUrl(id: string): Promise<string> {
  if (!isApiConfigured()) throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré.");
  const user = auth?.currentUser;
  if (!user) throw new ApiError(401, 'unauthenticated', 'Connecte-toi pour continuer.');
  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}/api/media/${encodeURIComponent(id)}/file`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status, 'media', `Aperçu indisponible (${res.status}).`);
  return URL.createObjectURL(await res.blob());
}

/** Sujets d'histoires proposés (liste de repli côté serveur si le modèle ne répond pas). */
export async function getStorySubjects(): Promise<string[]> {
  return (await authedCall<{ subjects: string[] }>('/api/story/subjects')).subjects;
}

/** Histoire en dessin animé, à partir d'un sujet (choisi ou écrit) ou d'un script fourni. */
export async function generateStory(input: {
  source: 'topic' | 'script';
  topic?: string;
  script?: string;
  mode: 'narrator' | 'dialogue' | 'both';
}): Promise<import('../video-engine/story').Story> {
  return (await authedCall<{ story: import('../video-engine/story').Story }>('/api/story', { method: 'POST', body: input })).story;
}
