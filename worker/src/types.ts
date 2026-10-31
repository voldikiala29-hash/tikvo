export interface Env {
  DB: D1Database;

  // Variables non secrètes (wrangler.toml)
  FRONTEND_URL: string;
  FIREBASE_PROJECT_ID: string;
  GITHUB_REPO: string;
  GITHUB_REF: string;
  TIKTOK_SCOPES: string;
  EXTRA_ORIGINS?: string;
  ALLOWED_OPEN_IDS?: string;

  // Secrets (poussés par le workflow de déploiement)
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  GH_DISPATCH_TOKEN?: string;
  RENDER_SECRET?: string;
  PEXELS_API_KEY?: string;
  PIXABAY_API_KEY?: string;
  // Cache optionnel (namespace KV « tikvo-cache ») ; sans lui, cache mémoire du Worker.
  CACHE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  FIREBASE_API_KEY?: string;
}

export type JobStatus =
  | 'queued'
  | 'rendering'
  | 'rendered'
  | 'publishing'
  | 'scheduled'
  | 'published'
  | 'failed';

export const JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'rendering',
  'rendered',
  'publishing',
  'scheduled',
  'published',
  'failed',
];

export type PrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

export const PRIVACY_LEVELS: readonly PrivacyLevel[] = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
];

export interface JobParams {
  niche: { id: string; name: string };
  hook: string;
  script: string;
  keywords: string[];
  voice: string;
  pexelsIds: number[];
}

export interface PublishInfo {
  caption?: string;
  privacy?: PrivacyLevel;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandContent?: boolean;
  brandOrganic?: boolean;
  isAigc?: boolean;
  publishAt?: number; // ms epoch, programmation
  apiUrl?: string; // origine du Worker, transmise au workflow de publication
  publishId?: string;
  tiktokStatus?: string;
  postIds?: string[];
  username?: string;
  error?: string | null;
  updatedAt?: number;
}

export interface JobRow {
  id: string;
  open_id: string;
  status: JobStatus;
  step: string;
  progress: number;
  params: string;
  video_url: string | null;
  video_bytes: number | null;
  duration_sec: number | null;
  publish: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export interface AccountRow {
  open_id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: number;
  refresh_expires_at: number;
  scopes: string;
  created_at: number;
  updated_at: number;
}

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
