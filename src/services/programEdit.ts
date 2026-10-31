// Modifications d'un programme. Fonctions pures : aucune écriture ici.
import { generateProgram, videoForNiche } from './programGenerator.ts';
import type { NicheId, ProgramDay, ProgramDuration, ProgramVideo } from './programGenerator.ts';

/** Remplace la niche d'une vidéo (un jour, un index). Les autres vidéos ne bougent pas. */
export function withNicheForVideo(days: ProgramDay[], date: string, index: number, niche: NicheId, seed: number): ProgramDay[] {
  return days.map((day) => {
    if (day.date !== date) return day;
    return {
      ...day,
      videos: day.videos.map((video, i) => (i === index ? videoForNiche(niche, video.time, seed) : video)),
    };
  });
}

/**
 * Recrée les jours postérieurs à aujourd'hui avec les niches demandées.
 * Les jours passés et le jour présent restent identiques.
 */
export function withProgramNiches(days: ProgramDay[], niches: NicheId[], duration: ProgramDuration, todayIso: string): ProgramDay[] {
  if (days.length === 0) return days;
  const generated = generateProgram(niches, duration, new Date(`${days[0].date}T12:00:00`)).days;
  const byDate = new Map(generated.map((day) => [day.date, day]));
  return days.map((day) => (day.date > todayIso ? byDate.get(day.date) ?? day : day));
}

export function nichesOf(days: ProgramDay[]): NicheId[] {
  const seen: NicheId[] = [];
  for (const day of days) {
    for (const video of day.videos) if (!seen.includes(video.niche)) seen.push(video.niche);
  }
  return seen;
}

export function totalOf(days: ProgramDay[]): number {
  return days.reduce((n, day) => n + day.videos.length, 0);
}

/**
 * Après une modification, le programme a un nouvel identifiant : on recopie les scripts
 * validés à la main (ou par l'IA) des vidéos qui n'ont pas changé. Les autres repartent du modèle.
 * Renvoie les nouvelles clés (`nouvelId|date|index`) à enregistrer.
 */
export function carryOverrides(
  oldId: string,
  newId: string,
  overrides: Record<string, string>,
  oldDays: ProgramDay[],
  newDays: ProgramDay[],
): Record<string, string> {
  const index = (days: ProgramDay[]) => {
    const map = new Map<string, ProgramVideo>();
    for (const day of days) day.videos.forEach((video, i) => map.set(`${day.date}|${i}`, video));
    return map;
  };
  const before = index(oldDays);
  const after = index(newDays);
  const prefix = `${oldId}|`;
  const carried: Record<string, string> = {};
  for (const [key, script] of Object.entries(overrides)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const a = before.get(rest);
    const b = after.get(rest);
    if (a && b && a.niche === b.niche && a.script === b.script) carried[`${newId}|${rest}`] = script;
  }
  return carried;
}
