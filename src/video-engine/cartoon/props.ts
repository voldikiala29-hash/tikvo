// Propriétés du montage dessin animé : décor, personnages placés et sous-titres par plan.
// Fonctions pures, partagées par le pipeline (construction) et le moteur Remotion (affichage).
import { CHARACTERS, characterById, type Expression, type Role, type SetId } from './catalog.ts';
import type { SceneDirection } from './direction.ts';
import type { KaraokeWord } from '../types.ts';
import { FPS, alignedWords, hookFramesFor } from '../timeline.ts';
import type { BoundaryEvent } from '../timeline.ts';

/** Même marge de fin que le montage Pixabay (voir pipeline/compose.ts). */
const TAIL_SECONDS = 0.8;

export interface CartoonActor {
  characterId: string;
  expression: Expression;
  /** Le personnage principal parle la voix off : sa bouche bouge pendant les mots. */
  speaking: boolean;
  /** Position horizontale, en fraction de la largeur (0 à 1, centre du personnage). */
  x: number;
  /** Taille relative (1 = taille de base). */
  scale: number;
}

export interface CartoonScene {
  from: number;
  durationInFrames: number;
  set: SetId;
  actors: CartoonActor[];
}

export interface CartoonProps {
  hookText: string;
  nicheName: string;
  karaokeWords: KaraokeWord[];
  audioSrc?: string;
  totalDurationInFrames: number;
  hookFrames: number;
  brandTag?: string;
  width: number;
  height: number;
  showNiche: boolean;
  showProgress: boolean;
  scenes: CartoonScene[];
}

/** Disposition selon le nombre de personnages : le principal est toujours le premier de la liste. */
const LAYOUT: Record<number, { x: number; scale: number }[]> = {
  1: [{ x: 0.5, scale: 1.9 }],
  2: [
    { x: 0.3, scale: 1.6 },
    { x: 0.72, scale: 1.6 },
  ],
  3: [
    { x: 0.2, scale: 1.35 },
    { x: 0.5, scale: 1.35 },
    { x: 0.8, scale: 1.35 },
  ],
};

/** Personnage du catalogue pour un rôle, jamais le principal (un rôle absent prend un autre personnage). */
export function characterForRole(role: Role | 'main', mainId: string): string {
  if (role === 'main') return mainId;
  const match = CHARACTERS.find((c) => c.role === role && c.id !== mainId);
  if (match) return match.id;
  return CHARACTERS.find((c) => c.id !== mainId)?.id ?? mainId;
}

/** Plans du montage : chaque direction reçoit sa fenêtre de temps et ses personnages placés. */
export function cartoonScenes(
  directions: SceneDirection[],
  windows: { from: number; durationInFrames: number }[],
  mainId: string,
): CartoonScene[] {
  const main = characterById(mainId).id;
  return directions.map((dir, i) => {
    const layout = LAYOUT[dir.actors.length] ?? LAYOUT[1];
    const actors: CartoonActor[] = dir.actors.map((actor, k) => ({
      characterId: characterForRole(actor.role, main),
      expression: actor.expression,
      speaking: actor.role === 'main',
      x: layout[k].x,
      scale: layout[k].scale,
    }));
    return {
      from: windows[i].from,
      durationInFrames: windows[i].durationInFrames,
      set: dir.set,
      actors,
    };
  });
}

export interface CartoonVideoInput {
  hook: string;
  nicheName: string;
  script: string;
  events: BoundaryEvent[];
  audioSec: number;
  audioSrc: string;
  directions: SceneDirection[];
  windows: { from: number; durationInFrames: number }[];
  mainCharacter: string;
  showNiche: boolean;
  showProgress: boolean;
  brandTag?: string;
  width: number;
  height: number;
}

/** Propriétés complètes du montage dessin animé, à partir de la voix et des mises en scène. */
export function cartoonVideoProps(input: CartoonVideoInput): CartoonProps {
  const words = alignedWords(input.events, input.script, input.audioSec);
  return {
    hookText: input.hook,
    nicheName: input.nicheName,
    karaokeWords: words,
    audioSrc: input.audioSrc,
    totalDurationInFrames: Math.ceil((input.audioSec + TAIL_SECONDS) * FPS),
    hookFrames: hookFramesFor(input.hook, words),
    brandTag: input.brandTag,
    width: input.width,
    height: input.height,
    showNiche: input.showNiche,
    showProgress: input.showProgress,
    scenes: cartoonScenes(input.directions, input.windows, input.mainCharacter),
  };
}
