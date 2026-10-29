// Client HTTP du site vers le Worker tikvo-api (Cloudflare).
// Toute la logique TikTok (jetons, publication) vit côté serveur : le navigateur ne voit jamais de secret.

const SESSION_KEY = 'TIKVO_TT_SESSION';

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

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function storeSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
}

/** Oublie la session locale (le serveur la supprime lui-même à l'expiration). */
export function forgetSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignoré */
  }
}

/**
 * Récupère la session renvoyée par le Worker après la connexion TikTok
 * (la redirection met `tt_session` ou `tt_error` dans le fragment d'URL).
 * Retourne le message d'erreur éventuel.
 */
export function consumeTikTokRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const queryAt = hash.indexOf('?');
  if (queryAt === -1) return null;

  const params = new URLSearchParams(hash.slice(queryAt + 1));
  const session = params.get('tt_session');
  const error = params.get('tt_error');
  if (!session && !error) return null;

  if (session) storeSessionToken(session);

  const route = hash.slice(0, queryAt);
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${route}`);
  return error;
}

export function startTikTokLogin(): void {
  if (!isApiConfigured()) {
    throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré (VITE_API_URL manquant au build).");
  }
  window.location.href = `${API_BASE}/auth/tiktok/start`;
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError(503, 'not_configured', "Le serveur tikvo n'est pas configuré (VITE_API_URL manquant au build).");
  }
  const headers: Record<string, string> = {};
  const token = getSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
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
    if (res.status === 401 && path !== '/auth/logout') forgetSession();
    throw new ApiError(res.status, data.error || 'error', data.message || `Erreur serveur (${res.status}).`);
  }
  return data as T;
}

// ---------------------------------------------------------------- types

export interface Me {
  openId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  scopes: string[];
  canPublish: boolean;
  stats: { followers: number; following: number; likes: number; videos: number } | null;
}

export interface CreatorInfo {
  nickname: string;
  username: string;
  avatarUrl: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
}

export type JobStatus = 'queued' | 'rendering' | 'rendered' | 'publishing' | 'scheduled' | 'published' | 'failed';

export interface JobView {
  id: string;
  status: JobStatus;
  step: string;
  progress: number;
  params: { niche: { id: string; name: string } | null; hook: string; voice: string };
  videoUrl: string | null;
  videoBytes: number | null;
  durationSec: number | null;
  publish: {
    caption?: string;
    privacy?: PrivacyLevel;
    publishAt?: number;
    publishId?: string;
    tiktokStatus?: string;
    postIds?: string[];
    username?: string;
    error: string | null;
  };
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export type PrivacyLevel = 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';

export interface CreateJobInput {
  niche: { id: string; name: string };
  hook: string;
  script: string;
  keywords: string[];
  voice: string;
  pexelsIds: number[];
}

export interface PublishOptions {
  caption: string;
  privacy: PrivacyLevel;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  isAigc: boolean;
  /** Date de programmation, en millisecondes depuis l'époque. Absente = publication immédiate. */
  publishAt?: number;
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

// ---------------------------------------------------------------- appels

export const backend = {
  me: () => call<Me>('/me'),
  creatorInfo: () => call<CreatorInfo>('/tiktok/creator-info'),
  async logout(): Promise<void> {
    await call('/auth/logout', { method: 'POST' }).catch(() => undefined);
    forgetSession();
  },
  async disconnect(): Promise<void> {
    await call('/auth/disconnect', { method: 'POST' });
    forgetSession();
  },
  pexelsSearch: (query: string, perPage = 8) =>
    call<{ videos: PexelsVideoView[] }>(`/pexels/search?query=${encodeURIComponent(query)}&per_page=${perPage}`),
  async createJob(input: CreateJobInput): Promise<JobView> {
    return (await call<{ job: JobView }>('/jobs', { method: 'POST', body: input })).job;
  },
  async getJob(id: string): Promise<JobView> {
    return (await call<{ job: JobView }>(`/jobs/${id}`)).job;
  },
  async publishJob(id: string, options: PublishOptions): Promise<JobView> {
    return (await call<{ job: JobView }>(`/jobs/${id}/publish`, { method: 'POST', body: options })).job;
  },
  async cancelSchedule(id: string): Promise<JobView> {
    return (await call<{ job: JobView }>(`/jobs/${id}/cancel-schedule`, { method: 'POST' })).job;
  },
};
