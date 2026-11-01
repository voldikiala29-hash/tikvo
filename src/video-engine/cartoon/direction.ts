// Mise en scène d'un plan à partir de sa description en français :
// quel décor, quels personnages, quelle émotion. Sans mot reconnu : bureau, personnage principal neutre.
// Fonctions pures, sans accents ni casse dans les correspondances.
import type { Expression, Role, SetId } from './catalog.ts';

export interface ActorDirection {
  /** « main » = le personnage principal choisi par l'utilisateur. */
  role: Role | 'main';
  expression: Expression;
}

export interface SceneDirection {
  set: SetId;
  actors: ActorDirection[];
}

/** Au plus trois personnages à l'écran : le principal et deux secondaires. */
export const MAX_ACTORS = 3;

const fold = (s: string): string => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Ordre compte : le premier décor reconnu l'emporte. Le bureau sert de décor par défaut.
const SET_WORDS: [SetId, string[]][] = [
  ['salle-reunion', ['reunion', 'salle de reunion', 'tableau blanc', 'ordre du jour']],
  ['couloir', ['couloir', 'porte', 'escalier', 'ascenseur']],
  ['exterieur', ['dehors', 'exterieur', 'rue', 'parking', 'ville', 'trottoir']],
  ['bureau', ['bureau', 'open space', 'ordinateur', 'ecran', 'travail', 'poste']],
];

const ROLE_WORDS: [Role | 'main', string[]][] = [
  ['main', ['employe', 'moi', 'je', 'il', 'elle', 'lui']],
  ['patron', ['patron', 'directeur', 'chef', 'manager']],
  ['rh', ['rh', 'drh', 'ressources humaines']],
  ['collegue', ['collegue', 'collegues', 'stagiaire', 'coequipier']],
];

const EMOTION_WORDS: [Expression, string[]][] = [
  ['colere', ['colere', 'enerve', 'furieux', 'hurle', 'crie', 'agace']],
  ['triste', ['triste', 'pleure', 'decu', 'abattu', 'inquiet']],
  ['surpris', ['surpris', 'choque', 'etonne', 'stupefait']],
  ['content', ['content', 'heureux', 'sourit', 'ravi', 'fier', 'soulage', 'rit']],
];

function matches(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
}

/** Première entrée de la table dont un mot figure dans le texte (ordre de la table). */
function firstMatch<T>(text: string, table: [T, string[]][]): T | null {
  for (const [key, words] of table) if (matches(text, words)) return key;
  return null;
}

/** Découpe une description en segments : « patron en colère, employé surpris » → deux segments. */
function segments(text: string): string[] {
  return text
    .split(/[,;]|\bet\b|\bpuis\b|\bpendant\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function directScene(description: string): SceneDirection {
  const text = fold(description);
  const set = firstMatch(text, SET_WORDS) ?? 'bureau';

  // Chaque personnage secondaire garde l'émotion de son segment ; le principal garde la sienne.
  let mainExpression: Expression = 'neutre';
  const others = new Map<Role, Expression>();

  for (const seg of segments(text)) {
    const emotion = firstMatch(seg, EMOTION_WORDS);
    const roles = ROLE_WORDS.filter(([, words]) => matches(seg, words)).map(([role]) => role);
    if (roles.length === 0) {
      if (emotion) mainExpression = emotion;
      continue;
    }
    for (const role of roles) {
      if (role === 'main') {
        if (emotion) mainExpression = emotion;
      } else if (!others.has(role)) {
        others.set(role, emotion ?? 'neutre');
      }
    }
  }

  // Si la description ne découpe rien (pas de segment), l'émotion du texte entier vaut pour le principal.
  if (mainExpression === 'neutre') {
    const whole = firstMatch(text, EMOTION_WORDS);
    if (whole && others.size === 0) mainExpression = whole;
  }

  const actors: ActorDirection[] = [{ role: 'main', expression: mainExpression }];
  for (const [role, expression] of others) {
    if (actors.length < MAX_ACTORS) actors.push({ role, expression });
  }
  return { set, actors };
}
