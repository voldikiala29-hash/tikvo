// Montage d'une histoire : chaque scène montre les héros qui parlent ou qui agissent, chacun avec son geste.
// Fonctions pures : le narrateur n'apparaît jamais à l'écran.
import type { Story, StoryExpression } from '../story.ts';
import type { PlacedTimeline } from './dialogue.ts';
import type { CartoonActor, CartoonAudioTrack, CartoonProps, CartoonScene, CartoonUtterance } from './props.ts';
import { cartoonLayout } from './props.ts';
import type { CharacterLook } from './catalog.ts';

const MAX_ON_SCREEN = 3;

export interface StoryVideoInput {
  story: Story;
  timeline: PlacedTimeline;
  /** Piste audio de chaque réplique, dans l'ordre de `timeline.items`. */
  audioFiles: string[];
  hook: string;
  nicheName: string;
  brandTag?: string;
  width: number;
  height: number;
  showNiche: boolean;
  showProgress: boolean;
  hookFrames: number;
  karaokeWords: CartoonProps['karaokeWords'];
}

/** Héros visibles dans une scène : ceux qui parlent ou agissent, dans l'ordre d'apparition, sans le narrateur. */
export function sceneCast(story: Story, sceneIndex: number): string[] {
  const scene = story.scenes[sceneIndex];
  const order: string[] = [];
  const add = (id: string) => {
    if (id !== 'narrator' && !order.includes(id) && story.characters.some((c) => c.id === id)) order.push(id);
  };
  scene.lines.forEach((l) => add(l.speaker));
  scene.actions.forEach((a) => add(a.actor));
  return order.slice(0, MAX_ON_SCREEN);
}

/** Apparence d'un héros de l'histoire, dans le format du dessin. */
function lookOf(story: Story, id: string): Partial<CharacterLook> {
  const c = story.characters.find((h) => h.id === id);
  if (!c) return {};
  return { id: c.id, name: c.name, role: 'employe', hair: c.hair, hairColor: c.hairColor, shirt: c.shirt, tie: c.tie, glasses: c.glasses, skin: '#FFFFFF' };
}

/** Dernière émotion d'un héros dans la scène (neutre par défaut). */
function expressionOf(story: Story, sceneIndex: number, id: string): StoryExpression {
  const lines = story.scenes[sceneIndex].lines.filter((l) => l.speaker === id);
  return lines.length > 0 ? lines[lines.length - 1].expression : 'neutre';
}

export function storyCartoonProps(input: StoryVideoInput): CartoonProps {
  const { story, timeline } = input;
  const scenes: CartoonScene[] = timeline.sceneWindows.map((win, i) => {
    const scene = story.scenes[i];
    // Une scène sans héros (narration seule) montre tout de même le premier héros, immobile.
    const cast = sceneCast(story, i);
    const shown = cast.length > 0 ? cast : story.characters.slice(0, 1).map((c) => c.id);
    const layout = cartoonLayout(shown.length);
    const actors: CartoonActor[] = shown.map((id, k) => {
      const act = scene.actions.find((a) => a.actor === id);
      return {
        key: id,
        characterId: id,
        expression: expressionOf(story, i, id),
        speaking: false,
        x: layout[k].x,
        scale: layout[k].scale,
        action: act?.action,
        look: lookOf(story, id),
      };
    });
    return { from: win.from, durationInFrames: win.durationInFrames, set: scene.set, actors };
  });

  const utterances: CartoonUtterance[] = timeline.items.map((it) => ({
    speaker: it.speaker,
    startFrame: it.startFrame,
    endFrame: it.endFrame,
  }));
  const audioTracks: CartoonAudioTrack[] = timeline.items.map((it, k) => ({
    src: input.audioFiles[k],
    fromFrame: it.startFrame,
    durationInFrames: it.endFrame - it.startFrame,
  }));

  return {
    hookText: input.hook,
    nicheName: input.nicheName,
    karaokeWords: input.karaokeWords,
    totalDurationInFrames: timeline.totalFrames,
    hookFrames: input.hookFrames,
    brandTag: input.brandTag,
    width: input.width,
    height: input.height,
    showNiche: input.showNiche,
    showProgress: input.showProgress,
    scenes,
    utterances,
    audioTracks,
  };
}
