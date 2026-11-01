// Histoires en dessin animé : invite pour le modèle, lecture et validation de sa réponse.
// Module pur (aucun import) : testé sous Node. Le modèle répond en JSON ; tout ce qui ne respecte pas
// le format est refusé, et l'appelant demande une nouvelle version.

export const STORY_HAIRS = ['court', 'frange', 'chignon', 'herisse', 'gris'] as const;
export const STORY_EXPRESSIONS = ['neutre', 'content', 'colere', 'triste', 'surpris'] as const;
export const STORY_SETS = ['bureau', 'couloir', 'salle-reunion', 'exterieur'] as const;
export const STORY_MODES = ['narrator', 'dialogue', 'both'] as const;

export type StoryMode = (typeof STORY_MODES)[number];
export type StoryExpression = (typeof STORY_EXPRESSIONS)[number];

export interface StoryCharacter {
  id: string;
  name: string;
  hair: (typeof STORY_HAIRS)[number];
  hairColor: string;
  shirt: string;
  tie?: string;
  glasses: boolean;
  voice: { gender: 'f' | 'm'; age: 'jeune' | 'adulte' | 'senior' };
}

export interface StoryLine {
  /** « narrator » ou l'identifiant d'un héros. */
  speaker: string;
  text: string;
  expression: StoryExpression;
}

export interface StoryScene {
  set: (typeof STORY_SETS)[number];
  seconds: number;
  /** Texte du narrateur pendant la scène (absent en mode dialogues). */
  narration?: string;
  lines: StoryLine[];
}

export interface Story {
  title: string;
  hook: string;
  mode: StoryMode;
  characters: StoryCharacter[];
  scenes: StoryScene[];
}

export interface StoryRequest {
  /** « topic » : un sujet (choisi ou écrit). « script » : le texte fourni par l'utilisateur. */
  source: 'topic' | 'script';
  topic?: string;
  script?: string;
  mode: StoryMode;
}

export const MAX_CHARACTERS = 4;
export const MIN_SCENES = 2;
export const MAX_SCENES = 8;
export const MIN_TOTAL_SECONDS = 10;
export const MAX_TOTAL_SECONDS = 120;

const ID_RE = /^[a-z][a-z0-9-]{1,19}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const fail = (message: string): never => {
  throw new Error(message);
};

/** Texte court et propre : espaces réduits, bornes respectées, sinon erreur. */
function textOf(value: unknown, min: number, max: number, label: string): string {
  if (typeof value !== 'string') return fail(`${label} : texte attendu.`);
  const t = value.replace(/\s+/g, ' ').trim();
  if (t.length < min || t.length > max) return fail(`${label} : entre ${min} et ${max} caractères.`);
  return t;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) return fail(`${label} : valeur inconnue.`);
  return value as T;
}

function hex(value: unknown, label: string): string {
  if (typeof value !== 'string' || !HEX_RE.test(value)) return fail(`${label} : couleur attendue (#RRGGBB).`);
  return value;
}

/** Extrait l'objet JSON d'une réponse de modèle (texte autour, balises de code tolérés). */
export function extractJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/```[a-z]*|```/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return fail('Réponse sans objet JSON.');
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return fail('JSON invalide.');
  }
}

function character(value: unknown, index: number, seen: Set<string>): StoryCharacter {
  if (!value || typeof value !== 'object') return fail(`Héros ${index + 1} : objet attendu.`);
  const o = value as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  if (!ID_RE.test(id) || id === 'narrator') return fail(`Héros ${index + 1} : identifiant invalide.`);
  if (seen.has(id)) return fail(`Héros ${index + 1} : identifiant en double (${id}).`);
  seen.add(id);
  const voice = (o.voice ?? {}) as Record<string, unknown>;
  const tie = o.tie === undefined || o.tie === null ? undefined : hex(o.tie, `Héros ${id} : cravate`);
  return {
    id,
    name: textOf(o.name, 1, 30, `Héros ${id} : nom`),
    hair: oneOf(o.hair, STORY_HAIRS, `Héros ${id} : coiffure`),
    hairColor: hex(o.hairColor, `Héros ${id} : couleur de cheveux`),
    shirt: hex(o.shirt, `Héros ${id} : couleur du vêtement`),
    tie,
    glasses: o.glasses === true,
    voice: {
      gender: oneOf(voice.gender, ['f', 'm'] as const, `Héros ${id} : genre de voix`),
      age: oneOf(voice.age, ['jeune', 'adulte', 'senior'] as const, `Héros ${id} : âge de voix`),
    },
  };
}

/**
 * Valide une histoire reçue du modèle et renvoie sa version normalisée.
 * Règles : le mode dicte la présence du narrateur ; chaque réplique a un locuteur connu ;
 * durée totale entre 10 et 120 s ; 2 à 8 scènes ; 1 à 4 héros.
 */
export function parseStory(raw: string, mode: StoryMode): Story {
  const o = extractJsonObject(raw) as Record<string, unknown>;
  const title = textOf(o.title, 3, 80, 'Titre');
  const hook = textOf(o.hook, 3, 120, 'Accroche');

  if (!Array.isArray(o.characters) || o.characters.length < 1 || o.characters.length > MAX_CHARACTERS) {
    return fail(`Entre 1 et ${MAX_CHARACTERS} héros attendus.`);
  }
  const seen = new Set<string>();
  const characters = o.characters.map((c, i) => character(c, i, seen));
  const ids = new Set(characters.map((c) => c.id));

  if (!Array.isArray(o.scenes) || o.scenes.length < MIN_SCENES || o.scenes.length > MAX_SCENES) {
    return fail(`Entre ${MIN_SCENES} et ${MAX_SCENES} scènes attendues.`);
  }

  let total = 0;
  let lineCount = 0;
  const scenes: StoryScene[] = o.scenes.map((s, i) => {
    const label = `Scène ${i + 1}`;
    if (!s || typeof s !== 'object') return fail(`${label} : objet attendu.`);
    const sc = s as Record<string, unknown>;
    const seconds = typeof sc.seconds === 'number' && Number.isFinite(sc.seconds) ? Math.round(sc.seconds) : NaN;
    if (!(seconds >= 2 && seconds <= 15)) return fail(`${label} : durée entre 2 et 15 s.`);
    total += seconds;

    let narration: string | undefined;
    if (sc.narration !== undefined && sc.narration !== null && sc.narration !== '') {
      if (mode === 'dialogue') return fail(`${label} : narration interdite en mode dialogues.`);
      narration = textOf(sc.narration, 3, 200, `${label} : narration`);
    }

    const rawLines = sc.lines === undefined ? [] : sc.lines;
    if (!Array.isArray(rawLines) || rawLines.length > 3) return fail(`${label} : 0 à 3 répliques.`);
    const lines: StoryLine[] = rawLines.map((l, k) => {
      const lo = (l ?? {}) as Record<string, unknown>;
      const speaker = typeof lo.speaker === 'string' ? lo.speaker : '';
      if (speaker === 'narrator') {
        if (mode === 'dialogue') return fail(`${label} : pas de narrateur en mode dialogues.`);
      } else if (!ids.has(speaker)) {
        return fail(`${label}, réplique ${k + 1} : locuteur inconnu.`);
      }
      return {
        speaker,
        text: textOf(lo.text, 2, 160, `${label}, réplique ${k + 1}`),
        expression: oneOf(lo.expression ?? 'neutre', STORY_EXPRESSIONS, `${label}, réplique ${k + 1} : émotion`),
      };
    });
    lineCount += lines.length;
    if (!narration && lines.length === 0) return fail(`${label} : narration ou réplique attendue.`);

    return { set: oneOf(sc.set, STORY_SETS, `${label} : décor`), seconds, narration, lines };
  });

  if (total < MIN_TOTAL_SECONDS || total > MAX_TOTAL_SECONDS) {
    return fail(`Durée totale entre ${MIN_TOTAL_SECONDS} et ${MAX_TOTAL_SECONDS} s (obtenu ${total} s).`);
  }
  if (mode !== 'narrator' && lineCount === 0) return fail('Aucune réplique : il faut des dialogues.');
  if (mode === 'narrator' && !scenes.some((s) => s.narration)) return fail('Aucune narration : le narrateur doit raconter.');

  return { title, hook, mode, characters, scenes };
}

/** Invite envoyée au modèle : format JSON strict, règles de cohérence, et source de l'histoire. */
export const STORY_SYSTEM =
  'Tu es scénariste de dessins animés courts en français. Tu réponds uniquement par un objet JSON valide, sans texte autour.';

export function storyPrompt(request: StoryRequest): string {
  const modeText: Record<StoryMode, string> = {
    narrator: 'Un narrateur raconte toute l’histoire en voix off (champ "narration" de chaque scène). Aucune réplique de héros, "lines" vide.',
    dialogue: 'Pas de narrateur : les héros se parlent uniquement (champ "lines"). Aucun champ "narration".',
    both: 'Un narrateur pose le récit (champ "narration") et les héros parlent par moments (champ "lines").',
  };
  const source =
    request.source === 'script'
      ? [
          'Source : le texte fourni par l’utilisateur ci-dessous. Garde ses phrases exactement telles quelles',
          '(dans les narrations ou répliques), ne les réécris pas. Ajoute seulement les héros et les scènes qui les montrent.',
          '',
          'Texte :',
          (request.script ?? '').trim(),
        ]
      : [`Sujet : ${(request.topic ?? '').trim()}`, 'Invente une histoire courte et complète autour de ce sujet.'];

  return [
    ...source,
    '',
    modeText[request.mode],
    '',
    'Format JSON exact :',
    '{',
    '  "title": "titre court",',
    '  "hook": "accroche de 1 phrase qui donne envie de regarder",',
    '  "characters": [{"id":"employe","name":"Nom","hair":"court|frange|chignon|herisse|gris","hairColor":"#RRGGBB","shirt":"#RRGGBB","tie":"#RRGGBB ou absent","glasses":false,"voice":{"gender":"f|m","age":"jeune|adulte|senior"}}],',
    '  "scenes": [{"set":"bureau|couloir|salle-reunion|exterieur","seconds":4,"narration":"texte ou absent","lines":[{"speaker":"id du héros ou narrator","text":"réplique","expression":"neutre|content|colere|triste|surpris"}]}]',
    '}',
    '',
    'Règles :',
    `- 1 à ${MAX_CHARACTERS} héros, identifiants en minuscules sans accent (ex. "employe", "patron").`,
    `- ${MIN_SCENES} à ${MAX_SCENES} scènes, chacune de 2 à 15 s ; durée totale de ${MIN_TOTAL_SECONDS} à ${MAX_TOTAL_SECONDS} s.`,
    '- Chaque scène a une narration ou au moins une réplique. Au plus 3 répliques par scène.',
    '- Les scènes suivent le récit dans l’ordre, et chaque héros a une apparence cohérente d’une scène à l’autre.',
    '- Phrases courtes, faciles à dire à voix haute. Pas d’emoji, pas de hashtag.',
  ].join('\n');
}

/** Sujets proposés à l'utilisateur : plusieurs choix, chacun une phrase. */
export const SUBJECT_FALLBACK = [
  'Un employé découvre une erreur sur sa fiche de paie',
  'Une collègue cache une bonne nouvelle au bureau',
  'Le patron organise une réunion surprise le vendredi',
  'Un stagiaire perd les clés de la salle de réunion',
  'Un livreur se trompe d’étage et rencontre une équipe inattendue',
];

export function subjectsPrompt(count = 6): string {
  return [
    `Propose ${count} sujets courts d’histoires de dessins animés (quelques personnes, une situation, un petit retournement).`,
    'Réponds uniquement par un tableau JSON de chaînes, en français. Pas d’emoji, pas de hashtag.',
  ].join('\n');
}

/** Lit la liste de sujets du modèle ; sinon renvoie la liste de repli. */
export function parseSubjects(raw: string): string[] {
  try {
    const cleaned = raw.replace(/```[a-z]*|```/gi, '');
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end <= start) return SUBJECT_FALLBACK;
    const list = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (!Array.isArray(list)) return SUBJECT_FALLBACK;
    const subjects = list
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length >= 8 && s.length <= 100);
    return subjects.length >= 3 ? subjects.slice(0, 8) : SUBJECT_FALLBACK;
  } catch {
    return SUBJECT_FALLBACK;
  }
}
