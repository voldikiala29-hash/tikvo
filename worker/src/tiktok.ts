import { AccountRow, Env, HttpError } from './types';
import { decryptText, encryptText, now } from './util';

const OPEN_API = 'https://open.tiktokapis.com';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
}

export interface TikTokUser {
  open_id: string;
  display_name?: string;
  avatar_url?: string;
  username?: string;
  is_verified?: boolean;
  profile_deep_link?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface CreatorInfo {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

export function requireTikTokConfig(env: Env): { clientKey: string; clientSecret: string } {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) {
    throw new HttpError(503, 'not_configured', 'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET manquants côté serveur (voir SETUP.md).');
  }
  return { clientKey: env.TIKTOK_CLIENT_KEY, clientSecret: env.TIKTOK_CLIENT_SECRET };
}

export function requireRenderSecret(env: Env): string {
  if (!env.RENDER_SECRET || env.RENDER_SECRET.length < 16) {
    throw new HttpError(503, 'not_configured', 'RENDER_SECRET manquant ou trop court côté serveur (16 caractères minimum, voir SETUP.md).');
  }
  return env.RENDER_SECRET;
}

export function authorizeUrl(env: Env, redirectUri: string, state: string): string {
  const { clientKey } = requireTikTokConfig(env);
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: env.TIKTOK_SCOPES || 'user.info.basic',
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function tokenRequest(env: Env, body: Record<string, string>): Promise<TokenResponse> {
  const { clientKey, clientSecret } = requireTikTokConfig(env);
  const res = await fetch(`${OPEN_API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...body }).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || data.error || !data.access_token || !data.refresh_token || !data.open_id) {
    const reason = data.error_description || data.error || `HTTP ${res.status}`;
    throw new HttpError(502, 'tiktok_token', `TikTok a refusé l'échange de jeton : ${reason}`);
  }
  return data as TokenResponse;
}

export function exchangeCode(env: Env, code: string, redirectUri: string): Promise<TokenResponse> {
  return tokenRequest(env, {
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
}

export function refreshTokens(env: Env, refreshToken: string): Promise<TokenResponse> {
  return tokenRequest(env, { grant_type: 'refresh_token', refresh_token: refreshToken });
}

export async function revokeToken(env: Env, accessToken: string): Promise<void> {
  const { clientKey, clientSecret } = requireTikTokConfig(env);
  await fetch(`${OPEN_API}/v2/oauth/revoke/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, token: accessToken }).toString(),
  }).catch(() => undefined);
}

/** Traduit les erreurs TikTok en messages compréhensibles. */
export function explainTikTokError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'unaudited_client_can_only_post_to_private_accounts':
      return "Ton app TikTok n'a pas encore passé l'audit : elle ne peut publier que des vidéos privées (« Moi uniquement ») sur un compte privé. Fais auditer l'app dans le portail développeur pour publier en public.";
    case 'privacy_level_option_mismatch':
      return "Ce niveau de confidentialité n'est pas autorisé pour ce compte. Choisis une des options proposées.";
    case 'spam_risk_too_many_posts':
      return 'Limite quotidienne de publications atteinte sur ce compte TikTok. Réessaie demain.';
    case 'spam_risk_user_banned_from_posting':
      return 'TikTok a bloqué les publications de ce compte.';
    case 'reached_active_user_cap':
      return "Le quota quotidien d'utilisateurs de ton app TikTok est atteint.";
    case 'access_token_invalid':
      return 'Session TikTok expirée : reconnecte ton compte.';
    case 'scope_not_authorized':
      return "Autorisation manquante : reconnecte TikTok en acceptant la publication de vidéos (scope video.publish).";
    case 'rate_limit_exceeded':
      return 'Trop de requêtes vers TikTok. Patiente une minute.';
    default:
      return fallback;
  }
}

interface TikTokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string; log_id?: string };
}

async function openApi<T>(
  path: string,
  accessToken: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${OPEN_API}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<T>;
  const code = json.error?.code;
  if (code && code !== 'ok') {
    const status = res.status === 401 ? 401 : 502;
    throw new HttpError(status, code, explainTikTokError(code, json.error?.message || `Erreur TikTok (${code})`));
  }
  if (!res.ok) {
    throw new HttpError(502, 'tiktok_http', `TikTok a répondu HTTP ${res.status}.`);
  }
  return (json.data ?? ({} as T)) as T;
}

export async function fetchUser(accessToken: string, scopes: string[]): Promise<TikTokUser> {
  const fields = ['open_id', 'union_id', 'avatar_url', 'display_name'];
  if (scopes.includes('user.info.profile')) fields.push('username', 'is_verified', 'profile_deep_link');
  if (scopes.includes('user.info.stats')) fields.push('follower_count', 'following_count', 'likes_count', 'video_count');
  const data = await openApi<{ user?: TikTokUser }>(`/v2/user/info/?fields=${fields.join(',')}`, accessToken);
  return data.user ?? ({ open_id: '' } as TikTokUser);
}

export function queryCreatorInfo(accessToken: string): Promise<CreatorInfo> {
  return openApi<CreatorInfo>('/v2/post/publish/creator_info/query/', accessToken, { method: 'POST', body: {} });
}

/** Retourne un access token valide pour ce compte, en le rafraîchissant si besoin. */
export async function getValidAccessToken(env: Env, openId: string): Promise<string> {
  const secret = requireRenderSecret(env);
  const load = () =>
    env.DB.prepare('SELECT * FROM accounts WHERE open_id = ?').bind(openId).first<AccountRow>();

  let row = await load();
  if (!row) throw new HttpError(401, 'tiktok_reauth', 'Compte TikTok introuvable : reconnecte-toi.');

  if (row.access_expires_at - 120_000 > now()) {
    return decryptText(secret, row.access_token);
  }
  if (row.refresh_expires_at <= now()) {
    throw new HttpError(401, 'tiktok_reauth', 'La connexion TikTok a expiré : reconnecte ton compte.');
  }

  try {
    const fresh = await refreshTokens(env, await decryptText(secret, row.refresh_token));
    await env.DB.prepare(
      'UPDATE accounts SET access_token = ?, refresh_token = ?, access_expires_at = ?, refresh_expires_at = ?, scopes = ?, updated_at = ? WHERE open_id = ?',
    )
      .bind(
        await encryptText(secret, fresh.access_token),
        await encryptText(secret, fresh.refresh_token),
        now() + fresh.expires_in * 1000,
        now() + fresh.refresh_expires_in * 1000,
        fresh.scope || row.scopes,
        now(),
        openId,
      )
      .run();
    return fresh.access_token;
  } catch (err) {
    // Un autre appel a peut-être déjà rafraîchi les jetons : on relit une fois.
    row = await load();
    if (row && row.access_expires_at - 120_000 > now()) {
      return decryptText(secret, row.access_token);
    }
    throw err instanceof HttpError
      ? new HttpError(401, 'tiktok_reauth', `${err.message} Reconnecte ton compte TikTok.`)
      : err;
  }
}
