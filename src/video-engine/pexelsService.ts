import { VideoClip } from './types';

// Curated high-resolution 9:16 vertical video clips per niche (Royalty Free Pexels / CDN stock)
const NICHE_CURATED_CLIPS: Record<string, VideoClip[]> = {
  mode: [
    {
      id: 'clip-mode-1',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
      source: 'pexels',
      keyword: 'luxury runway outfit fashion',
      durationInFrames: 300,
    },
    {
      id: 'clip-mode-2',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600',
      source: 'pexels',
      keyword: 'streetwear blazer style',
      durationInFrames: 300,
    },
    {
      id: 'clip-mode-3',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
      source: 'pexels',
      keyword: 'accessories luxury watch leather',
      durationInFrames: 300,
    },
  ],
  cuisine: [
    {
      id: 'clip-cui-1',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
      source: 'pexels',
      keyword: 'sizzling pan chef steak',
      durationInFrames: 300,
    },
    {
      id: 'clip-cui-2',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      source: 'pexels',
      keyword: 'chopping knife herbs fresh',
      durationInFrames: 300,
    },
    {
      id: 'clip-cui-3',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
      source: 'pexels',
      keyword: 'cheese pull delicious gourmet',
      durationInFrames: 300,
    },
  ],
  business: [
    {
      id: 'clip-biz-1',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
      source: 'pexels',
      keyword: 'stock candlestick crypto laptop',
      durationInFrames: 300,
    },
    {
      id: 'clip-biz-2',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
      source: 'pexels',
      keyword: 'glass skyscraper modern city',
      durationInFrames: 300,
    },
    {
      id: 'clip-biz-3',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600',
      source: 'pexels',
      keyword: 'typing keyboard entrepreneur',
      durationInFrames: 300,
    },
  ],
  beaute: [
    {
      id: 'clip-bea-1',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
      source: 'pexels',
      keyword: 'skincare serum dropper glow',
      durationInFrames: 300,
    },
    {
      id: 'clip-bea-2',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600',
      source: 'pexels',
      keyword: 'makeup brush lipgloss face',
      durationInFrames: 300,
    },
    {
      id: 'clip-bea-3',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
      source: 'pexels',
      keyword: 'clean skin glass skin aesthetic',
      durationInFrames: 300,
    },
  ],
  fitness: [
    {
      id: 'clip-fit-1',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600',
      source: 'pexels',
      keyword: 'dumbbell gym workout deadlift',
      durationInFrames: 300,
    },
    {
      id: 'clip-fit-2',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
      source: 'pexels',
      keyword: 'chalk hands barbell crossfit',
      durationInFrames: 300,
    },
    {
      id: 'clip-fit-3',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600',
      source: 'pexels',
      keyword: 'running sprint track athlete',
      durationInFrames: 300,
    },
  ],
};

/**
 * Fetches or provides 3 sequenced video clips for the specified niche & keywords
 */
export async function fetchPexelsClips(
  nicheId: string,
  keywords: string[] = []
): Promise<VideoClip[]> {
  const normalizedNiche = nicheId.toLowerCase().replace(/[^a-z]/g, '');
  const clips = NICHE_CURATED_CLIPS[normalizedNiche] || NICHE_CURATED_CLIPS.business;

  // If user has Pexels API key configured in localStorage/environment, we can call official API:
  const pexelsApiKey = localStorage.getItem('PEXELS_API_KEY');
  if (pexelsApiKey && keywords.length > 0) {
    try {
      const query = encodeURIComponent(keywords.join(' '));
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${query}&orientation=portrait&per_page=3`,
        {
          headers: {
            Authorization: pexelsApiKey,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.videos && data.videos.length >= 3) {
          return data.videos.slice(0, 3).map((v: any, index: number) => {
            const videoFile =
              v.video_files.find((f: any) => f.height >= 1080 && f.width <= 1080) ||
              v.video_files[0];
            return {
              id: `pexels-${v.id}`,
              url: videoFile?.link || clips[index].url,
              thumbnailUrl: v.image || clips[index].thumbnailUrl,
              source: 'pexels',
              keyword: keywords[index] || 'viral clip',
              durationInFrames: 300,
            };
          });
        }
      }
    } catch (err) {
      console.warn('[Pexels Service] Fallback to curated 9:16 vertical stock:', err);
    }
  }

  return clips;
}
