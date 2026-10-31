// Génère un programme de vidéos à partir de templates par niche.
// Aucun appel à une IA : les textes sont des modèles remplis par sujet, déterministes et rapides.

import { clipQueryFor } from './clipQueries';
import { generateScripts, type ScriptItem } from './backendApi';

export const NICHE_CATALOG = [
  { id: 'mode', label: 'Mode', emoji: '👗' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'business', label: 'Business', emoji: '💼' },
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'motivation', label: 'Motivation', emoji: '🔥' },
  { id: 'cuisine', label: 'Cuisine', emoji: '🍳' },
  { id: 'voyage', label: 'Voyage', emoji: '✈️' },
  { id: 'tech', label: 'Tech', emoji: '📱' },
  { id: 'beaute', label: 'Beauté', emoji: '💄' },
  { id: 'musique', label: 'Musique', emoji: '🎵' },
  { id: 'sport', label: 'Sport', emoji: '⚽' },
  { id: 'humour', label: 'Humour', emoji: '😂' },
] as const;

export type NicheId = (typeof NICHE_CATALOG)[number]['id'];
export type ProgramDuration = '1week' | '2weeks' | '1month';

export const PROGRAM_DURATIONS: Record<ProgramDuration, { label: string; days: number; videos: number }> = {
  '1week': { label: '1 semaine', days: 7, videos: 21 },
  '2weeks': { label: '2 semaines', days: 14, videos: 42 },
  '1month': { label: '1 mois', days: 30, videos: 90 },
};

export const VIDEOS_PER_DAY = 3;
export const POSTING_TIMES = ['08:00', '13:00', '19:00'] as const;

export interface ProgramVideo {
  time: string;
  title: string;
  hook: string;
  script: string;
  pexelsQuery: string;
  niche: NicheId;
  status: 'planned';
}

export interface ProgramDay {
  date: string; // AAAA-MM-JJ (heure locale)
  videos: ProgramVideo[];
}

/** Ajoute la ponctuation finale si le modèle l'a oubliée (la voix lit mieux). */
const punctuate = (line: string): string => (/[.!?…]$/.test(line) ? line : `${line}.`);

/**
 * Programme avec des scripts écrits par Meta Llama (Workers AI).
 * Les scripts sont attribués dans l'ordre du programme, niche par niche.
 * Là où l'IA ne fournit rien (indisponible, lot raté), le modèle de secours reste en place.
 */
export async function generateProgramWithAI(
  nicheIds: NicheId[],
  duration: ProgramDuration,
  startDate: Date = tomorrow(),
): Promise<GeneratedProgram> {
  const base = generateProgram(nicheIds, duration, startDate);
  const niches = Array.from(new Set(nicheIds));

  let scripts: Record<string, ScriptItem[]> = {};
  try {
    scripts = (await generateScripts(niches, PROGRAM_DURATIONS[duration].videos)).scripts ?? {};
  } catch (err) {
    console.warn('[programme] scripts IA indisponibles, modèles de secours :', err instanceof Error ? err.message : err);
  }

  const used = new Map<string, number>();
  let fromAI = 0;
  for (const day of base.days) {
    const queriesToday = new Set<string>();
    for (const video of day.videos) {
      const k = used.get(video.niche) ?? 0;
      used.set(video.niche, k + 1);
      const item = scripts[video.niche]?.[k];
      if (!item) {
        queriesToday.add(video.pexelsQuery);
        continue;
      }
      fromAI++;
      video.title = item.hook;
      video.hook = item.hook;
      video.script = [item.hook, item.phrase1, item.phrase2, item.cta].map(punctuate).join('\n');
      // Requête de clip : celle de l'IA si elle est nouvelle pour ce jour, sinon celle du modèle.
      if (item.pexelsQuery && !queriesToday.has(item.pexelsQuery)) video.pexelsQuery = item.pexelsQuery;
      queriesToday.add(video.pexelsQuery);
    }
  }
  console.info(`[programme] ${fromAI}/${base.totalVideos} scripts écrits par Llama, le reste en modèle de secours`);
  return base;
}

export interface GeneratedProgram {
  days: ProgramDay[];
  totalVideos: number;
}

interface NicheTemplate {
  subjects: string[];
  hooks: string[];
}

const GENERIC_HOOKS = [
  'Le piège avec {s}',
  '{s} : ce que personne ne te dit',
  'Tu fais cette erreur avec {s}',
  'Ce choix sur {s} change tout',
  'Arrête de perdre du temps avec {s}',
  'La méthode simple pour {s}',
  'Ce que font les pros avec {s}',
  'En 30 secondes sur {s}',
  'Personne ne t’a montré {s} comme ça',
  'Avant de dépenser sur {s}, regarde ça',
];

const TEMPLATES: Record<NicheId, NicheTemplate> = {
  mode: {
    subjects: [
      'les pièces basiques', 'ta garde-robe', 'les accessoires petit prix', 'les tenues de bureau',
      'les couleurs qui t’avantagent', 'les vêtements de seconde main', 'les silhouettes qui allongent', 'le style minimaliste',
      'les chaussures qui vieillissent bien', 'les bijoux discrets', 'les matières qui se portent toute l’année', 'les tenues du week-end',
    ],
    hooks: [
      'Le piège avec {s}', '{s} : ce que personne ne te dit', 'Tu fais cette erreur avec {s}',
      'Une tenue complète avec {s}', 'Ce choix sur {s} change tout', 'Ton look en 10 secondes grâce à {s}',
      'Ce que font les stylistes avec {s}', 'Arrête de gaspiller ton argent sur {s}',
      'Ce détail sur {s} te vieillit', 'Ta tenue ratée ? Regarde {s}',
    ],
  },
  fitness: {
    subjects: ['les abdos', 'la course à pied', 'les étirements du matin', 'la récupération', 'les repas avant le sport', 'la motivation du lundi', 'les séances de 10 minutes', 'la prise de muscle', 'les pompes', 'les squats', 'l’échauffement', 'la mobilité des hanches'],
    hooks: GENERIC_HOOKS,
  },
  business: {
    subjects: ['ta première offre', 'ton prix', 'la prospection', 'ton budget de départ', 'les réseaux sociaux pour vendre', 'ta liste de clients', 'les petites dépenses', 'ton temps de travail', 'ton premier client', 'ta page de vente', 'ton tunnel de vente', 'ta tarification mensuelle'],
    hooks: GENERIC_HOOKS,
  },
  crypto: {
    subjects: ['le DCA', 'la sécurité de ton wallet', 'les arnaques en ligne', 'la gestion du risque', 'les frais de transaction', 'ton premier achat', 'les cycles de marché', 'les stablecoins', 'les exchanges', 'la diversification', 'les erreurs de débutant', 'la fiscalité des cryptos'],
    hooks: GENERIC_HOOKS,
  },
  motivation: {
    subjects: ['la procrastination', 'ta routine du matin', 'les mauvaises habitudes', 'la discipline', 'le doute', 'tes objectifs de l’année', 'la régularité', 'le repos', 'ta confiance en toi', 'les réussites du mois', 'les excuses', 'le bilan de la semaine'],
    hooks: GENERIC_HOOKS,
  },
  cuisine: {
    subjects: ['les repas de la semaine', 'le meal prep', 'les épices de base', 'les cuissons au four', 'les restes du frigo', 'les petits-déjeuners rapides', 'les sauces maison', 'les recettes à 5 ingrédients', 'les soupes d’hiver', 'les desserts express', 'les marinades', 'les légumes de saison'],
    hooks: GENERIC_HOOKS,
  },
  voyage: {
    subjects: ['les vols pas chers', 'ta valise', 'les hôtels à petit budget', 'les itinéraires de 3 jours', 'les pièges touristiques', 'les assurances voyage', 'le sac à dos', 'les destinations hors saison', 'les bagages cabine', 'les trains', 'les applis de voyage', 'les visas'],
    hooks: GENERIC_HOOKS,
  },
  tech: {
    subjects: ['ton smartphone', 'la sécurité de ton compte', 'les applis gratuites', 'ton stockage cloud', 'les raccourcis clavier', 'ton ordinateur lent', 'les outils IA gratuits', 'ta batterie', 'ton wifi', 'les mots de passe', 'les notifications', 'ton email'],
    hooks: GENERIC_HOOKS,
  },
  beaute: {
    subjects: ['la routine skincare du soir', 'les soins à petit prix', 'les erreurs de maquillage', 'le démaquillage', 'l’hydratation', 'les produits à éviter', 'le contour des yeux', 'les cheveux secs', 'le SPF', 'les lèvres gercées', 'les ongles', 'le rasage'],
    hooks: GENERIC_HOOKS,
  },
  musique: {
    subjects: ['ton premier beat', 'les accords faciles', 'ton micro', 'la composition', 'les logiciels gratuits', 'les refrains qui restent', 'le mixage', 'la voix', 'ta playlist', 'les concerts', 'le son de ta voix', 'ton home studio'],
    hooks: GENERIC_HOOKS,
  },
  sport: {
    subjects: ['le foot amateur', 'la préparation avant match', 'la récupération après match', 'les blessures courantes', 'le running débutant', 'le vélo', 'la natation', 'les chaussures de sport', 'le tennis', 'le basket', 'le stretching après effort', 'le coaching sportif'],
    hooks: GENERIC_HOOKS,
  },
  humour: {
    subjects: ['les réunions Zoom', 'les parents', 'les courses au supermarché', 'les chats', 'les débuts de semaine', 'les livreurs', 'le dimanche soir', 'les voisins', 'les cousins', 'les mariages', 'les mardis', 'les applications de rencontre'],
    hooks: ['Quand {s} te dépasse', '{s} : la vérité brute', 'Personne ne parle de {s}', 'Ton avis sur {s} ?', 'Le moment où {s} te trahit', 'Ce que {s} ne te dit jamais', 'Tu reconnais {s} ?', 'Dix secondes sur {s}', 'Le plus drôle sur {s}', 'Qui d’autre vit ça avec {s} ?'],
  },
};

const BODIES = [
  'Pour {s}, commence par une seule action aujourd’hui, pas dix.',
  'Première règle sur {s} : la régularité bat l’intensité.',
  'Montre-le à l’écran pendant que tu parles, les gens retiennent ce qu’ils voient.',
  'Sur {s}, un test concret vaut mieux que cent conseils.',
  'Le détail qui change tout avec {s} tient en une phrase : fais simple.',
  'Si tu ne devais retenir qu’une chose sur {s}, c’est celle-ci.',
];

const CTAS = [
  'Enregistre cette vidéo pour la retrouver plus tard.',
  'Abonne-toi pour la suite de ton programme.',
  'Dis-moi en commentaire ce que tu testes.',
  'Partage-la à quelqu’un qui en a besoin.',
];

const fill = (pattern: string, subject: string): string => pattern.replace(/\{s\}/g, subject);
const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Date locale au format AAAA-MM-JJ (évite le décalage UTC de toISOString). */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tomorrow(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function buildVideo(niche: NicheId, k: number, n: number, time: string): ProgramVideo {
  const t = TEMPLATES[niche];
  // Chaque combinaison (accroche × sujet) est unique jusqu'à 64 vidéos par niche, puis elle se répète.
  const hookPattern = t.hooks[k % t.hooks.length];
  const subject = t.subjects[Math.floor(k / t.hooks.length) % t.subjects.length];
  const hook = fill(hookPattern, subject);
  const body = fill(BODIES[k % BODIES.length], subject);
  const cta = CTAS[n % CTAS.length];
  return {
    time,
    title: hook,
    hook: capitalize(subject),
    script: [`${hook}.`, body, cta].join('\n'),
    pexelsQuery: clipQueryFor(niche, n),
    niche,
    status: 'planned',
  };
}

/**
 * Programme complet : VIDEOS_PER_DAY vidéos par jour, niches alternées en rotation.
 * Le premier jour est demain (heure locale).
 */
export function generateProgram(
  nicheIds: NicheId[],
  duration: ProgramDuration,
  startDate: Date = tomorrow(),
): GeneratedProgram {
  const niches = Array.from(new Set(nicheIds));
  if (niches.length < 1 || niches.length > 3) throw new Error('Choisis entre 1 et 3 niches.');
  const config = PROGRAM_DURATIONS[duration];
  if (!config) throw new Error('Durée de programme inconnue.');

  const perNiche = new Map<NicheId, number>();
  const days: ProgramDay[] = [];
  for (let d = 0; d < config.days; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    const videos: ProgramVideo[] = [];
    for (let j = 0; j < VIDEOS_PER_DAY; j++) {
      const n = d * VIDEOS_PER_DAY + j;
      const niche = niches[n % niches.length];
      const k = perNiche.get(niche) ?? 0;
      perNiche.set(niche, k + 1);
      videos.push(buildVideo(niche, k, n, POSTING_TIMES[j]));
    }
    days.push({ date: toLocalISODate(date), videos });
  }
  return { days, totalVideos: config.days * VIDEOS_PER_DAY };
}
