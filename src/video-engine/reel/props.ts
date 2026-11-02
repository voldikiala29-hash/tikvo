// Template « Replica / Motion » : types des props et ligne de temps de 45 s (1080×1920, 30 i/s).
// Fonctions pures, partagées par le moteur Remotion et le Worker.

export const REEL_FPS = 30;
export const REEL_DURATION_SEC = 45;
export const REEL_DURATION_FRAMES = REEL_FPS * REEL_DURATION_SEC;
/** Nombre de réplicas affichés dans la grille de la solution (x1 → x11). */
export const SKILL_GRID_SIZE = 11;
/** Avis collectés dans le segment « twist ». */
export const REVIEW_COUNT = 1241;

export interface PriceItem {
  name: string;
  /** Prix en euros. */
  price: number;
}

export interface ReelProps {
  /** Accroche des 3 premières secondes. Le dernier mot est mis en évidence. */
  hook: string;
  /** Lignes de la carte « ce que ça coûte aujourd'hui ». */
  priceItems: PriceItem[];
  /** Nom de l'application analysée (ex. « Notion »). */
  appName: string;
  /** Mot à écrire en commentaire pour recevoir la skill (ex. « REPLICA »). */
  ctaKeyword: string;
  /** Voix off générée par le pipeline ; vide = pas de voix. */
  voiceOverUrl: string;
  /** Noms des 11 skills de la grille (complétés ou tronqués à SKILL_GRID_SIZE). */
  skills: string[];
}

export type ReelSceneName = 'hook' | 'pain' | 'solution' | 'demo' | 'twist' | 'cta';

export interface ReelScene {
  name: ReelSceneName;
  from: number;
  durationInFrames: number;
}

const seconds = (s: number): number => Math.round(s * REEL_FPS);

/** Segments du reel, contigus, de la première à la dernière frame. */
export const REEL_SCENES: ReelScene[] = [
  { name: 'hook', from: seconds(0), durationInFrames: seconds(3) },
  { name: 'pain', from: seconds(3), durationInFrames: seconds(5) },
  { name: 'solution', from: seconds(8), durationInFrames: seconds(7) },
  { name: 'demo', from: seconds(15), durationInFrames: seconds(17) },
  { name: 'twist', from: seconds(32), durationInFrames: seconds(8) },
  { name: 'cta', from: seconds(40), durationInFrames: seconds(5) },
];

export const REEL_DEFAULTS: ReelProps = {
  hook: 'Tes outils IA coûtent une fortune',
  priceItems: [
    { name: 'Outil de rédaction', price: 29 },
    { name: 'Outil de design', price: 15 },
    { name: 'Outil d’analyse', price: 49 },
  ],
  appName: 'Notion',
  ctaKeyword: 'REPLICA',
  voiceOverUrl: '',
  skills: ['recon', 'pricing', 'onboarding', 'reviews', 'ui', 'copy', 'seo', 'funnel', 'emails', 'analytics', 'roadmap'],
};

/** Total des prix de la carte « douleur ». */
export function totalPrice(items: PriceItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

/** Mot-clé de l'accroche : le dernier mot, sans ponctuation finale. */
export function hookHighlight(hook: string): { before: string; keyword: string } {
  const words = hook.trim().split(/\s+/);
  const keyword = (words.pop() ?? '').replace(/[.!?…]+$/, '');
  return { before: words.join(' '), keyword };
}

/** Ajuste les skills à la taille de la grille : complète par des emplacements vides ou tronque. */
export function gridSkills(skills: string[]): string[] {
  return skills.slice(0, SKILL_GRID_SIZE);
}
