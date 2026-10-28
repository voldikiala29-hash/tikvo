/**
 * TikTok Business & Content Posting API Service
 * 
 * Provides interface and stubs for official TikTok Display API & TikTok Commercial Content API.
 * Compatible with TikTok Login Kit & Direct Post API v2.
 * Documentation: https://developers.tiktok.com/doc/overview
 */

export interface TikTokApiConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  accessToken?: string;
  refreshToken?: string;
  openId?: string;
  isSandbox: boolean;
}

export interface TikTokPostPayload {
  videoFileUrl?: string;
  videoBlob?: Blob;
  caption: string;
  privacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disableDuet: boolean;
  disableStitch: boolean;
  disableComment: boolean;
  brandCommercialContent: boolean;
  brandOrganicCommercialContent: boolean;
  scheduledPublishTime?: number; // Unix timestamp in seconds
}

export interface TikTokPublishResult {
  publishId: string;
  status: 'PROCESSING_DOWNLOAD' | 'PROCESSING_UPLOAD' | 'SUCCESS' | 'FAILED';
  shareUrl?: string;
  errorCode?: number;
  errorMessage?: string;
}

export interface TikTokUserStats {
  openId: string;
  unionId: string;
  avatarUrl: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
  isVerified: boolean;
}

export class TikTokBusinessApiService {
  private config: TikTokApiConfig;

  constructor(initialConfig?: Partial<TikTokApiConfig>) {
    this.config = {
      clientKey: initialConfig?.clientKey || (localStorage.getItem('TIKTOK_CLIENT_KEY') || 'awq89voldi72x1m'),
      clientSecret: initialConfig?.clientSecret || (localStorage.getItem('TIKTOK_CLIENT_SECRET') || ''),
      redirectUri: initialConfig?.redirectUri || window.location.origin + '/oauth/tiktok/callback',
      scope: initialConfig?.scope || [
        'user.info.basic',
        'user.info.profile',
        'user.info.stats',
        'video.list',
        'video.upload',
        'video.publish',
        'research.adlib',
      ],
      accessToken: localStorage.getItem('TIKTOK_ACCESS_TOKEN') || undefined,
      refreshToken: localStorage.getItem('TIKTOK_REFRESH_TOKEN') || undefined,
      isSandbox: true,
    };
  }

  /**
   * Generates the official TikTok OAuth v2 authorization URL
   * Opens the authorization dialog where the TikTok creator grants permissions.
   */
  public getAuthorizationUrl(state: string = 'voldi_state_hash'): string {
    const baseUrl = 'https://www.tiktok.com/v2/auth/authorize/';
    const params = new URLSearchParams({
      client_key: this.config.clientKey,
      scope: this.config.scope.join(','),
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      state: state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for an Access Token
   * POST https://open.tiktokapis.com/v2/oauth/token/
   */
  public async exchangeCodeForToken(authCode: string): Promise<{ accessToken: string; refreshToken: string; openId: string }> {
    // Stub prepared for future backend/proxy connection
    console.log('[TikTok API] Exchanging authorization code:', authCode);
    
    // In actual production, this request MUST be routed through backend to protect client_secret
    // return fetch('/api/tiktok/oauth/token', { method: 'POST', body: JSON.stringify({ code: authCode }) });

    // Stored locally for prototyping
    const mockToken = 'tt_at_' + Math.random().toString(36).substring(2) + Date.now();
    const mockRefresh = 'tt_rt_' + Math.random().toString(36).substring(2);
    const mockOpenId = 'user_tt_' + Math.random().toString(36).substring(2, 8);

    localStorage.setItem('TIKTOK_ACCESS_TOKEN', mockToken);
    localStorage.setItem('TIKTOK_REFRESH_TOKEN', mockRefresh);
    localStorage.setItem('TIKTOK_OPEN_ID', mockOpenId);

    this.config.accessToken = mockToken;
    this.config.refreshToken = mockRefresh;
    this.config.openId = mockOpenId;

    return {
      accessToken: mockToken,
      refreshToken: mockRefresh,
      openId: mockOpenId,
    };
  }

  /**
   * Refreshes an expired access token
   * POST https://open.tiktokapis.com/v2/oauth/token/ (grant_type=refresh_token)
   */
  public async refreshAccessToken(): Promise<string> {
    console.log('[TikTok API] Refreshing access token with refresh token:', this.config.refreshToken);
    // Prepared stub for future backend call
    return this.config.accessToken || 'tt_at_refreshed_' + Date.now();
  }

  /**
   * Publishes or schedules a video to TikTok using the Direct Post API v2
   * POST https://open.tiktokapis.com/v2/post/publish/video/init/
   */
  public async publishVideo(payload: TikTokPostPayload): Promise<TikTokPublishResult> {
    console.log('[TikTok API] Initiating direct video publish with payload:', payload);

    // Prepared stub: In production, upload the video chunk to TikTok chunked upload endpoint, then finalize
    /*
      const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_info: {
            title: payload.caption,
            privacy_level: payload.privacyLevel,
            disable_duet: payload.disableDuet,
            disable_stitch: payload.disableStitch,
            disable_comment: payload.disableComment,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: 15420000,
            chunk_size: 10000000,
            total_chunk_count: 2
          }
        })
      });
      return await response.json();
    */

    return {
      publishId: 'pub_' + Math.random().toString(36).substring(2, 10),
      status: 'SUCCESS',
      shareUrl: 'https://www.tiktok.com/@voldistyle/video/' + Math.floor(100000000000000000 + Math.random() * 900000000000000000),
    };
  }

  /**
   * Fetches creator account analytics and live follower metrics
   * POST https://open.tiktokapis.com/v2/user/info/
   */
  public async fetchCreatorStats(): Promise<TikTokUserStats> {
    console.log('[TikTok API] Querying creator profile information & insights');
    // Prepared stub for user info
    return {
      openId: this.config.openId || 'voldi_creator_001',
      unionId: 'union_voldi_001',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      displayName: 'Tikokvoldi Verified Studio',
      followerCount: 248900,
      followingCount: 342,
      likesCount: 6840000,
      videoCount: 184,
      isVerified: true,
    };
  }

  /**
   * Disconnects TikTok account and clears session
   */
  public disconnect(): void {
    localStorage.removeItem('TIKTOK_ACCESS_TOKEN');
    localStorage.removeItem('TIKTOK_REFRESH_TOKEN');
    localStorage.removeItem('TIKTOK_OPEN_ID');
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
    this.config.openId = undefined;
  }

  /**
   * Returns current connection status
   */
  public isConnected(): boolean {
    return Boolean(this.config.accessToken || localStorage.getItem('TIKTOK_ACCESS_TOKEN'));
  }
}

export const tikTokApiService = new TikTokBusinessApiService();
