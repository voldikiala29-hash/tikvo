// Histoires en dessin animé : invite pour le modèle, lecture et validation de sa réponse.
// Module pur (aucun import) : testé sous Node. Le modèle répond en JSON ; tout ce qui ne respecte pas
// le format est refusé, et l'appelant demande une nouvelle version.

export const STORY_HAIRS = ['court', 'frange', 'chignon', 'herisse', 'gris'] as const;
export const STORY_EXPRESSIONS = ['neutre', 'content', 'colere', 'triste', 'surpris'] as const;
export const STORY_SETS = ['bureau', 'couloir', 'salle-reunion', 'exterieur'] as const;
export const STORY_MODES = ['narrator', 'dialogue', 'both'] as const;
export const STORY_ACTIONS = [
  'immobile',
  'marcher',
  'sauter',
  'lever-bras',
  'saluer',
  'pleurer',
  'sursauter',
  'rire',
  'applaudir',
  'entrer',
  'sortir',
] as const;
export const MAX_ACTIONS_PER_SCENE = 3;

export type StoryMode = (typeof STORY_MODES)[number];
export type StoryAction = (typeof STORY_ACTIONS)[number];
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

export interface StoryAct {
  /** Identifiant du héros qui fait le geste. */
  actor: string;
  action: StoryAction;
}

export interface StoryScene {
  set: (typeof STORY_SETS)[number];
  seconds: number;
  /** Texte du narrateur pendant la scène (absent en mode dialogues). */
  narration?: string;
  lines: StoryLine[];
  /** Gestes des héros pendant la scène. */
  actions: StoryAct[];
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
  return validateStory(extractJsonObject(raw), mode);
}

/** Valide un objet d'histoire (reçu du modèle, ou stocké dans un rendu) et renvoie sa version normalisée. */
export function validateStory(input: unknown, mode: StoryMode): Story {
  if (!input || typeof input !== 'object') return fail('Histoire : objet attendu.');
  const o = input as Record<string, unknown>;
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
      narration = textOf(sc.narration, 3, 400, `${label} : narration`);
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

    const rawActs = sc.actions === undefined ? [] : sc.actions;
    if (!Array.isArray(rawActs) || rawActs.length > MAX_ACTIONS_PER_SCENE) {
      return fail(`${label} : 0 à ${MAX_ACTIONS_PER_SCENE} gestes.`);
    }
    const actions: StoryAct[] = rawActs.map((a, k) => {
      const ao = (a ?? {}) as Record<string, unknown>;
      const actor = typeof ao.actor === 'string' ? ao.actor : '';
      if (!ids.has(actor)) return fail(`${label}, geste ${k + 1} : héros inconnu.`);
      return { actor, action: oneOf(ao.action, STORY_ACTIONS, `${label}, geste ${k + 1} : action`) };
    });

    return { set: oneOf(sc.set, STORY_SETS, `${label} : décor`), seconds, narration, lines, actions };
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
    '  "scenes": [{"set":"bureau|couloir|salle-reunion|exterieur","seconds":4,"narration":"texte ou absent","lines":[{"speaker":"id du héros ou narrator","text":"réplique","expression":"neutre|content|colere|triste|surpris"}],"actions":[{"actor":"id du héros","action":"immobile|marcher|sauter|lever-bras|saluer|pleurer|sursauter|rire|applaudir|entrer|sortir"}]}]',
    '}',
    '',
    'Règles :',
    `- 1 à ${MAX_CHARACTERS} héros, identifiants en minuscules sans accent (ex. "employe", "patron").`,
    `- ${MIN_SCENES} à ${MAX_SCENES} scènes, chacune de 2 à 15 s ; durée totale de ${MIN_TOTAL_SECONDS} à ${MAX_TOTAL_SECONDS} s.`,
    '- Chaque scène a une narration ou au moins une réplique. Au plus 3 répliques et 3 gestes par scène.',
    '- Les gestes collent à ce qui se passe dans la scène (pleurer si la scène est triste, lever les bras si quelqu’un gagne…).',
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

/** Texte prononcé de l'histoire, dans l'ordre (narration puis répliques de chaque scène). */
export function storyText(story: Story): string {
  return story.scenes
    .flatMap((scene) => [scene.narration, ...scene.lines.map((l) => l.text)])
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Script balisé : le texte de l'utilisateur est lu tel quel, sans passer par le modèle.
// Format : « [Scène 1 | bureau] », puis « Narrateur : texte », « Karim : texte », « Karim (colere) : texte ».
// ---------------------------------------------------------------------------

const SCENE_LINE = /^\[\s*sc[èe]ne\s*\d*\s*(?:\|\s*([^\]]*?)\s*)?\]$/i;
const SPEAKER_LINE = /^([^:()\[\]]{1,40}?)\s*(?:\(([^)]{1,20})\))?\s*:\s*(.+)$/;
const GESTURE_LINE = /^\[\s*geste\s*[:|]\s*(.+?)\s*\]$/i;
/** Gestes écrits en français, du plus long au plus court (« lever les bras » avant « lever »). */
const GESTURE_WORDS: [string, StoryAction][] = [
  ['lever les bras', 'lever-bras'],
  ['lever-bras', 'lever-bras'],
  ['immobile', 'immobile'],
  ['marcher', 'marcher'],
  ['sauter', 'sauter'],
  ['saluer', 'saluer'],
  ['pleurer', 'pleurer'],
  ['sursauter', 'sursauter'],
  ['rire', 'rire'],
  ['applaudir', 'applaudir'],
  ['entrer', 'entrer'],
  ['sortir', 'sortir'],
];
const HAIRS = ['court', 'frange', 'chignon', 'herisse', 'gris'] as const;
const HAIR_COLORS = ['#2B2B2B', '#6B3E2A', '#8E9399', '#1A1A1A'];
const SHIRTS = ['#E6EEF8', '#1F2F4D', '#7A4FB8', '#2E7D4F'];
const EMOTIONS: Record<string, StoryExpression> = {
  neutre: 'neutre',
  content: 'content',
  heureux: 'content',
  colere: 'colere',
  triste: 'triste',
  surpris: 'surpris',
};

/** Vrai si le texte utilise le format balisé (au moins un marqueur de scène). */
export function isMarkedScript(raw: string): boolean {
  return raw.split('\n').some((l) => SCENE_LINE.test(l.trim()));
}

const foldText = (s: string): string => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const slugOf = (name: string): string => {
  const base = foldText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20).replace(/-+$/, '');
  return /^[a-z]/.test(base) && base.length >= 2 ? base : `h-${base}`.slice(0, 20);
};

/** Durée d'une scène d'après son texte : environ 2,6 mots par seconde, entre 2 et 15 s. */
function secondsFor(words: number): number {
  return Math.min(15, Math.max(2, Math.round(words / 2.6) + 1));
}

/**
 * Transforme le texte balisé en histoire (à valider ensuite avec validateStory).
 * Décor : mot-clé du marqueur (bureau, couloir…). Héros : créés à partir des noms, voix féminine si le nom finit par e ou a.
 */
export function parseMarkedScript(raw: string): { input: unknown; mode: StoryMode } {
  // Import local pour éviter un cycle : la mise en scène des décors vit dans cartoon/direction.ts.
  const scenes: { set: StoryScene['set']; narration: string[]; lines: StoryLine[]; gestures: { name: string; action: StoryAction }[] }[] = [];
  const names = new Map<string, string>();
  const characters: StoryCharacter[] = [];

  const newScene = (decor: string | undefined) => {
    const set = directSet(decor ?? '');
    scenes.push({ set, narration: [], lines: [], gestures: [] });
  };

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const marker = SCENE_LINE.exec(line);
    if (marker) {
      newScene(marker[1]);
      continue;
    }
    if (scenes.length === 0) newScene(undefined);
    const gesture = GESTURE_LINE.exec(line);
    if (gesture) {
      const content = foldText(gesture[1]);
      const hit = GESTURE_WORDS.find(([word]) => content.endsWith(word));
      if (!hit) throw new Error(`Geste inconnu : « ${gesture[1]} ». Gestes : ${GESTURE_WORDS.map(([w]) => w).filter((w, i, a) => a.indexOf(w) === i).join(', ')}.`);
      const actor = gesture[1].slice(0, gesture[1].length - hit[0].length).replace(/[\s|:,-]+$/g, '').trim();
      if (!actor) throw new Error(`Geste sans héros : « ${gesture[1]} ». Écris par exemple « [Geste : Karim pleurer] ».`);
      scenes[scenes.length - 1].gestures.push({ name: actor, action: hit[1] });
      continue;
    }
    const m = SPEAKER_LINE.exec(line);
    if (!m) throw new Error(`Ligne sans locuteur : « ${line.slice(0, 60)} ». Écris « Narrateur : » ou « Nom : » devant la phrase.`);
    const name = m[1].trim();
    const text = m[3].replace(/\s+/g, ' ').trim();
    const scene = scenes[scenes.length - 1];

    if (foldText(name) === 'narrateur' || foldText(name) === 'narrator') {
      scene.narration.push(text);
      continue;
    }
    const emotionKey = m[2] ? foldText(m[2]).trim() : '';
    const expression = (emotionKey ? EMOTIONS[emotionKey] : undefined) ?? emotionFromText(text) ?? 'neutre';
    let id = names.get(name);
    if (!id) {
      if (characters.length >= 4) throw new Error('Quatre héros maximum : vérifie les noms de locuteurs.');
      id = slugOf(name);
      while (characters.some((c) => c.id === id)) id = `${id.slice(0, 18)}2`;
      names.set(name, id);
      const i = characters.length;
      const feminine = /[ae]$/i.test(foldText(name).split(' ')[0]);
      characters.push({
        id,
        name: name.slice(0, 30),
        hair: HAIRS[i % HAIRS.length],
        hairColor: HAIR_COLORS[i % HAIR_COLORS.length],
        shirt: SHIRTS[i % SHIRTS.length],
        tie: i % 2 === 0 ? '#D62B2B' : undefined,
        glasses: i % 3 === 2,
        voice: { gender: feminine ? 'f' : 'm', age: 'adulte' },
      });
    }
    scene.lines.push({ speaker: id, text, expression });
  }

  if (scenes.length === 0) throw new Error('Aucune scène trouvée.');
  const sceneOut: StoryScene[] = scenes.map((s) => {
    const narration = s.narration.length > 0 ? s.narration.join(' ') : undefined;
    const words = [narration ?? '', ...s.lines.map((l) => l.text)].join(' ').split(/\s+/).filter(Boolean).length;
    const written = s.gestures.map((g) => {
      const id = names.get(g.name) ?? names.get([...names.keys()].find((n) => foldText(n) === foldText(g.name)) ?? '');
      if (!id) throw new Error(`Geste : héros « ${g.name} » inconnu dans la scène.`);
      return { actor: id, action: g.action };
    });
    // Sans geste écrit : les gestes viennent du texte (verbes), attribués au héros nommé dans la phrase.
    const sentences = [narration ?? '', ...s.lines.map((l) => l.text)].flatMap((t) => t.split(/(?<=[.!?…])\s+/)).filter(Boolean);
    const nameOf = (sentence: string): string | null => {
      const t = foldText(sentence);
      for (const [name, id] of names) if (t.includes(foldText(name).split(' ')[0])) return id;
      return null;
    };
    const fallback = s.lines[0]?.speaker ?? characters[0]?.id ?? '';
    const actions = written.length > 0 ? written : inferActions(sentences, fallback, nameOf).filter((a) => a.actor);
    return { set: s.set, seconds: secondsFor(words), narration, lines: s.lines, actions };
  });
  const hasNarration = sceneOut.some((s) => s.narration);
  const hasLines = sceneOut.some((s) => s.lines.length > 0);
  const mode: StoryMode = hasNarration && hasLines ? 'both' : hasNarration ? 'narrator' : 'dialogue';
  const first = [sceneOut[0].narration, sceneOut[0].lines[0]?.text].find((t): t is string => !!t) ?? 'Histoire';
  const hook = first.length > 120 ? `${first.slice(0, 117).trim()}…` : first;
  const title = first.length > 60 ? `${first.slice(0, 57).trim()}…` : first;
  return { input: { title, hook, mode, characters, scenes: sceneOut }, mode };
}

/** Mise en scène d'un décor à partir du texte du marqueur (mots-clés, bureau par défaut). */
function directSet(decor: string): StoryScene['set'] {
  const t = foldText(decor);
  if (/reunion|salle/.test(t)) return 'salle-reunion';
  if (/couloir|porte|escalier|ascenseur/.test(t)) return 'couloir';
  if (/dehors|exterieur|rue|parking|ville|trottoir|immeuble/.test(t)) return 'exterieur';
  return 'bureau';
}

// ---------------------------------------------------------------------------
// Émotions et gestes déduits du texte : l'animation suit ce qui est raconté.
// ---------------------------------------------------------------------------

const EMOTION_CUES: [StoryExpression, RegExp][] = [
  ['colere', /\b(colere|enerve|furieux|hurle|crie|agace)\b/],
  ['triste', /\b(triste|pleure|decu|abattu|inquiet|sanglot)/],
  ['surpris', /\b(surpris|choque|etonne|stupefait|pas possible|incroyable)/],
  ['content', /\b(content|heureux|sourit|ravi|fier|soulage|rit)\b/],
];

/** Émotion suggérée par un texte (null si aucun indice). */
export function emotionFromText(text: string): StoryExpression | null {
  const t = foldText(text);
  for (const [expression, re] of EMOTION_CUES) if (re.test(t)) return expression;
  return null;
}

const ACTION_CUES: [StoryAction, RegExp][] = [
  ['pleurer', /\bpleur/],
  ['sursauter', /\bsursaut/],
  ['applaudir', /\bapplaud/],
  ['lever-bras', /\blev(?:e|er|ent|é)\b.*\bbras\b|\bbras en l'air\b/],
  ['saluer', /\bsalu(?:e|er|ent)\b/],
  ['sauter', /\bsaut(?:e|er|ent)\b/],
  ['rire', /\b(rit|rire|rigole|eclate de rire)\b/],
  ['entrer', /\bentre dans\b/],
  ['sortir', /\bsort(?:ir|ent)? de\b/],
  ['marcher', /\b(traverse|court|marche|avance|s'avance|se leve|se lève|se dirige)\b/],
];

/**
 * Gestes déduits d'une phrase : le héros nommé dans la phrase, sinon le premier locuteur de la scène.
 * Un seul geste par phrase, pas plus de MAX_ACTIONS_PER_SCENE au total.
 */
export function inferActions(sentences: string[], fallbackActor: string, nameOf: (text: string) => string | null): StoryAct[] {
  const out: StoryAct[] = [];
  for (const sentence of sentences) {
    if (out.length >= MAX_ACTIONS_PER_SCENE) break;
    const t = foldText(sentence);
    const hit = ACTION_CUES.find(([, re]) => re.test(t));
    if (!hit) continue;
    out.push({ actor: nameOf(sentence) ?? fallbackActor, action: hit[0] });
  }
  return out;
}
