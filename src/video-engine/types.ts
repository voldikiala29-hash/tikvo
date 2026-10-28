export interface KaraokeWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface VideoClip {
  id: string;
  url: string;
  thumbnailUrl: string;
  source: 'pexels' | 'stock';
  keyword: string;
  durationInFrames: number;
}

export interface ViralTemplateProps {
  hookText: string;
  scriptText: string;
  nicheName: string;
  clips: VideoClip[];
  karaokeWords: KaraokeWord[];
  musicUrl?: string;
  fps?: number;
  totalDurationInFrames?: number;
  brandTag?: string;
}

export interface VideoGenerationRequest {
  niche: string;
  script: string;
  hook: string;
  keywords: string[];
  autoPostToTikTok?: boolean;
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrl: string;
  duration: number;
  renderId: string;
  fps: number;
  resolution: string;
  clipsUsed: string[];
  tiktokPostResult?: {
    publishId: string;
    status: string;
  };
}
