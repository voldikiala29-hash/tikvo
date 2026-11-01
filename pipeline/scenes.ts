// Plans selon le script : une phrase = un plan, affiché pendant qu'on la prononce.
// Fonctions pures (aucun appel réseau) : testées sous Node.
import { splitWords } from '../src/video-engine/timeline.ts';
import type { KaraokeWord } from '../src/video-engine/types.ts';

export interface SceneWindow {
  from: number;
  durationInFrames: number;
}

export interface SceneClip {
  id: string;
  src: string;
  durationSec: number;
  credit?: string;
  kind?: 'video' | 'image';
}

export const MAX_SCENES = 8;
const MAX_WORDS_PER_LINE = 28;
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'this', 'that', 'of', 'a', 'an', 'in', 'on', 'at', 'to', 'is', 'are']);

/** Découpe le script en phrases à illustrer : une par ligne, puis coupe les lignes trop longues et fusionne les plus courtes. */
export function splitScenes(script: string, max = MAX_SCENES): string[] {
  let lines = script
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => splitWords(l).length > 0);
  lines = lines.flatMap((l) =>
    splitWords(l).length > MAX_WORDS_PER_LINE
      ? l
          .split(/(?<=[.!?…])\s+/)
          .map((s) => s.trim())
          .filter((s) => splitWords(s).length > 0)
      : [l],
  );
  while (lines.length > max && lines.length > 1) {
    let best = 0;
    let bestLen = Infinity;
    for (let i = 0; i < lines.length - 1; i++) {
      const len = splitWords(lines[i]).length + splitWords(lines[i + 1]).length;
      if (len < bestLen) {
        bestLen = len;
        best = i;
      }
    }
    lines.splice(best, 2, `${lines[best]} ${lines[best + 1]}`);
  }
  return lines;
}

/**
 * Fenêtre temporelle de chaque phrase, calée sur le moment où ses premiers mots sont prononcés.
 * La première commence à 0 et chaque fenêtre va jusqu'à la suivante, sans trou.
 */
export function sceneWindows(lines: string[], words: KaraokeWord[], totalFrames: number): SceneWindow[] {
  const starts: number[] = [];
  let cursor = 0;
  for (const line of lines) {
    const first = words[cursor];
    starts.push(first ? first.startFrame : totalFrames);
    cursor += splitWords(line).length;
  }
  const froms = starts.map((s, i) => {
    if (i === 0) return 0;
    return Math.min(totalFrames, Math.max(s, 0));
  });
  for (let i = 1; i < froms.length; i++) froms[i] = Math.max(froms[i], froms[i - 1]);
  return froms.map((from, i) => {
    const next = i + 1 < froms.length ? froms[i + 1] : totalFrames;
    return { from, durationInFrames: Math.max(1, next - from) };
  });
}

/**
 * Retire les phrases sans plan utilisable : leur durée revient à la phrase gardée précédente
 * (ou à la suivante si c'est la première). `keep[i]` = la phrase i a un plan.
 */
export function mergeDropped(windows: SceneWindow[], keep: boolean[]): { windows: SceneWindow[]; kept: number[] } {
  const out: SceneWindow[] = [];
  const kept: number[] = [];
  let prevEnd = 0;
  let lastEnd = 0;
  windows.forEach((w, i) => {
    const end = w.from + w.durationInFrames;
    lastEnd = end;
    if (keep[i]) {
      out.push({ from: prevEnd, durationInFrames: Math.max(1, end - prevEnd) });
      kept.push(i);
      prevEnd = end;
    }
  });
  if (out.length > 0 && windows.length > 0 && !keep[windows.length - 1]) {
    out[out.length - 1].durationInFrames = lastEnd - out[out.length - 1].from;
  }
  return { windows: out, kept };
}

/** Meilleur résultat pour une phrase : le plus de mots de la requête figurent dans ses tags, sans clip déjà pris. */
export function pickSceneHit<T extends { id: number; tags?: string }>(hits: T[], query: string, used: Set<number>): T | null {
  const wanted = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  // Strict : la moitié au moins des mots utiles doit figurer dans les tags (au moins un).
  // En dessous, aucun clip : mieux vaut pas de plan qu'un plan hors sujet.
  const required = Math.max(1, Math.ceil(wanted.length / 2));
  let best: T | null = null;
  let bestScore = required - 1;
  for (const hit of hits) {
    if (used.has(hit.id)) continue;
    const tags = (hit.tags ?? '').toLowerCase();
    const score = wanted.filter((w) => tags.includes(w)).length;
    if (score > bestScore) {
      best = hit;
      bestScore = score;
    }
  }
  return best;
}
