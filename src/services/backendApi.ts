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

export type RenderDuration = 15 | 30 | 60;
export type RenderStatus = 'queued' | 'rendering' | 'rendered' | 'failed';

export interface RenderJob {
  id: string;
  status: RenderStatus;
  step: string;
  progress: number;
  day: string | null;
  videoKey: string | null;
  duration: number | null;
  videoUrl: string | null;
  durationSec: number | null;
  error: string | null;
  createdAt: number;
}

export interface RenderRequest {
  title: string;
  hook: string;
  script: string;
  pexelsQuery: string;
  nicheId: string;
  nicheName: string;
  day: string;
  videoKey: string;
  duration: RenderDuration;
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
