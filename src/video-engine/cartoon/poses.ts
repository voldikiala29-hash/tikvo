// Poses des personnages : pour chaque geste, les angles des bras, le décalage vertical du corps,
// l'inclinaison, les larmes et les tremblements. Fonctions pures, testées sous Node.
import type { StoryAction } from '../story.ts';

export interface Pose {
  /** Angle des bras en degrés : 0 = le long du corps, 90 = à l'horizontale vers l'extérieur, 180 = en l'air. */
  armLeft: number;
  armRight: number;
  /** Décalage vertical du corps, en unités du dessin (négatif = vers le haut). */
  bodyY: number;
  /** Inclinaison du corps en degrés. */
  tilt: number;
  /** Décalage horizontal de la tête et du corps, en unités du dessin (tremblement). */
  shakeX: number;
  tears: boolean;
}

export const REST_POSE: Pose = { armLeft: 12, armRight: 12, bodyY: 0, tilt: 0, shakeX: 0, tears: false };

const TAU = Math.PI * 2;

/**
 * Pose à l'instant `t` (secondes depuis le début du geste).
 * Les gestes qui se répètent suivent un rythme fixe ; les gestes ponctuels tiennent leur dernière position.
 */
export function poseFor(action: StoryAction, t: number): Pose {
  const base = { ...REST_POSE };
  switch (action) {
    case 'marcher':
    case 'entrer':
    case 'sortir': {
      const swing = Math.sin(TAU * 1.6 * t);
      return { ...base, armLeft: 12 + 18 * swing, armRight: 12 - 18 * swing, bodyY: -4 * Math.abs(Math.sin(TAU * 1.6 * t)) };
    }
    case 'sauter': {
      const phase = (t % 0.7) / 0.7;
      return { ...base, armLeft: 165, armRight: 165, bodyY: -90 * Math.max(0, Math.sin(Math.PI * phase)) };
    }
    case 'lever-bras':
      return { ...base, armLeft: 15, armRight: Math.min(170, 20 + t * 320), bodyY: -4 * Math.min(1, t * 3) };
    case 'saluer':
      return { ...base, armLeft: 12, armRight: 150 + 14 * Math.sin(TAU * 3 * t) };
    case 'pleurer':
      return { ...base, armLeft: 110, armRight: 110, bodyY: 6, shakeX: 3 * Math.sin(TAU * 6 * t), tears: true };
    case 'sursauter': {
      const decay = Math.exp(-t * 7);
      return { ...base, armLeft: 40 + 130 * decay, armRight: 40 + 130 * decay, bodyY: -35 * decay, shakeX: 4 * decay * Math.sin(TAU * 10 * t) };
    }
    case 'rire':
      return { ...base, armLeft: 70, armRight: 70, bodyY: -7 * Math.abs(Math.sin(TAU * 2 * t)), tilt: 3 * Math.sin(TAU * 2 * t) };
    case 'applaudir': {
      const clap = Math.sin(TAU * 4 * t) > 0 ? 1 : 0;
      return { ...base, armLeft: 95 - 35 * clap, armRight: 95 - 35 * clap, bodyY: -3 * clap };
    }
    case 'immobile':
    default:
      return base;
  }
}
