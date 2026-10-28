export type NicheId =
  | 'mode'
  | 'beaute'
  | 'cuisine'
  | 'fitness'
  | 'business'
  | 'education'
  | 'comedie'
  | 'musique'
  | 'gaming'
  | 'lifestyle'
  | string;

export interface VideoTemplate {
  id: string;
  title: string;
  structure: string;
  avgRetention: string;
  bestDuration: string;
  exampleHook: string;
  description: string;
  recommendedSoundType: string;
}

export interface ViralHook {
  id: string;
  category: 'choc' | 'controverse' | 'promesse' | 'storytime' | 'curiosite';
  text: string;
  retentionRate: number; // e.g. 88%
  difficulty: 'Facile' | 'Moyen' | 'Expert';
}

export interface TrendingSound {
  id: string;
  title: string;
  artist: string;
  usageCount: string;
  growth: string;
  isHot: boolean;
  bpm: number;
  genre: string;
  audioPreviewUrl?: string;
  viralScore: number;
}

export interface TrendingHashtag {
  id: string;
  tag: string;
  views: string;
  growth: string;
  competition: 'Faible' | 'Moyenne' | 'Haute';
  trendScore: number;
}

export interface ViralFormat {
  id: string;
  name: string;
  badge: string;
  description: string;
  avgWatchTime: string;
  viralMultiplier: string;
}

export interface TikTokProduct {
  id: string;
  name: string;
  price: string;
  commission: string;
  commissionRate: number; // percentage
  sales24h: number;
  category: string;
  sampleAvailable: boolean;
  rating: number;
}

export interface AffiliateOffer {
  id: string;
  brand: string;
  offer: string;
  payout: string;
  conversionRate: string;
  status: 'Actif' | 'En attente' | 'Top Performer';
  link: string;
}

export interface TikTokAccount {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  nicheId: NicheId;
  followers: number;
  totalLikes: string;
  avgViews: string;
  engagementRate: string;
  apiConnected: boolean;
  autoPostEnabled: boolean;
  shadowbanRisk: 'Aucun' | 'Surveillance' | 'Alerte';
  creatorRewardsEligible: boolean;
}

export interface ScheduledPost {
  id: string;
  accountId: string;
  accountHandle: string;
  nicheId: NicheId;
  title: string;
  hook: string;
  caption: string;
  soundTitle: string;
  scheduledDate: string; // ISO or YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: 'draft' | 'queued' | 'published';
  format: string;
  duration: string;
  thumbnailGradient: string;
}

export interface ViralIdea {
  id: string;
  title: string;
  hook: string;
  concept: string;
  format: string;
  soundType: string;
  idealDuration: string;
  viralScore: number;
  niche: string;
  monetizationAngle: string;
}

export interface ScriptSection {
  timecode: string;
  title: string;
  action: string;
  speech: string;
  onScreenText: string;
  soundEffect: string;
}

export interface GeneratedScript {
  id: string;
  title: string;
  nicheId: NicheId;
  duration: string;
  tone: string;
  hook: string;
  cta: string;
  sections: ScriptSection[];
  hashtags: string[];
  recommendedSound: string;
  monetizationProduct?: string;
}

export interface NicheData {
  id: NicheId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  kpis: {
    totalViews: string;
    viewsGrowth: string;
    followers: string;
    followersGrowth: string;
    viralityRate: string;
    viralityGrowth: string;
    estimatedRevenue: string;
    revenueGrowth: string;
  };
  templates: VideoTemplate[];
  hooks: ViralHook[];
  sounds: TrendingSound[];
  hashtags: TrendingHashtag[];
  formats: ViralFormat[];
  products: TikTokProduct[];
  affiliates: AffiliateOffer[];
  accounts: TikTokAccount[];
  targetAudience: {
    ageRange: string;
    genderRatio: string;
    peakHours: string[];
    topGeo: string[];
  };
}
