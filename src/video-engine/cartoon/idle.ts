// Vie des personnages à l'arrêt : respiration, clignements, léger balancement des bras et du corps.
// Fonctions pures : le moteur Remotion les calcule à chaque frame, les tests les vérifient sous Node.
export interface Idle {
  /** Respiration, de -1 à 1. */
  breath: number;
  /** Vrai pendant le clignement (environ 0,1 s toutes les 3,6 s). */
  blink: boolean;
  /** Balancement du corps, de -1 à 1. */
  sway: number;
  /** Balancement des bras, de -1 à 1. */
  armSway: number;
}

const TAU = Math.PI * 2;
/** Décalage de phase entre personnages, pour qu'ils ne bougent pas tous à l'unisson. */
const phaseOf = (seed: number): number => seed * 0.9;

/** État de repos à l'instant `t` (secondes). `seed` distingue les personnages d'un même plan. */
export function idleFor(t: number, seed: number): Idle {
  const phase = phaseOf(seed);
  const cycle = (t + seed * 0.37) % 3.6;
  return {
    breath: Math.sin((TAU * t) / 2.8 + phase),
    blink: cycle > 3.42 && cycle < 3.52,
    sway: Math.sin((TAU * t) / 6 + phase),
    armSway: Math.sin((TAU * t) / 3.4 + phase + 1),
  };
}
