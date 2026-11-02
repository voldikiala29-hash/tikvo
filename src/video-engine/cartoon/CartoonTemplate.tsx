// Montage dessin animé : décor par plan, personnages placés, voix off et sous-titres mot par mot.
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { chunkAt, chunkCaptions } from '../captions.ts';
import { FPS } from '../timeline.ts';
import { Character } from './Character.tsx';
import { CartoonSet } from './Sets.tsx';
import { poseFor, REST_POSE, type Pose } from './poses.ts';
import { idleFor } from './idle.ts';
import { expressionAt, type CartoonProps, type CartoonScene, type CartoonUtterance } from './props.ts';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const resolveSrc = (src: string): string => (/^(https?:)?\/\//.test(src) ? src : staticFile(src));

/** Déplacement d'un personnage pendant la scène : entrée (depuis le côté), sortie (vers le côté). */
function moveOf(action: CartoonScene['actors'][number]['action'], t: number, duration: number): { dx: number; alpha: number } {
  if (action === 'entrer') return { dx: -0.3 * (1 - Math.min(1, t / 1)), alpha: Math.min(1, t / 0.4) };
  if (action === 'sortir') {
    const left = Math.max(0, duration - t);
    return { dx: 0.3 * Math.min(1, Math.max(0, 1 - left / 1)), alpha: Math.min(1, left / 0.4) };
  }
  return { dx: 0, alpha: 1 };
}

/** Un plan : décor, personnages, gestes et bouches qui parlent (`speakingKey` = héros qui parle). */
const SceneView: React.FC<{ scene: CartoonScene; width: number; height: number; speakingKey: string | null; mouth: number }> = ({
  scene,
  width,
  height,
  speakingKey,
  mouth,
}) => {
  // Dans une séquence, useCurrentFrame donne la frame locale au plan.
  const local = useCurrentFrame();
  const t = local / FPS;
  const duration = scene.durationInFrames / FPS;
  const floorY = height * 0.66;
  const charHeight = height * 0.2;
  return (
    <AbsoluteFill>
      <CartoonSet set={scene.set} />
      {scene.actors.map((actor, i) => {
        const h = charHeight * actor.scale;
        const w = (h * 200) / 360;
        const move = moveOf(actor.action, t, duration);
        const pose: Pose = actor.action ? poseFor(actor.action, t) : REST_POSE;
        const speaking = speakingKey !== null && speakingKey === actor.key;
        return (
          <div
            key={`${actor.key}-${i}`}
            style={{
              position: 'absolute',
              left: (actor.x + move.dx) * width - w / 2,
              top: floorY - h,
              width: w,
              height: h,
              opacity: move.alpha,
            }}
          >
            <Character
              characterId={actor.characterId}
              look={actor.look}
              expression={actor.expression}
              mouthOpen={speaking ? mouth : 0}
              pose={pose}
              height={h}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const CartoonTemplate: React.FC<CartoonProps> = ({
  hookText,
  nicheName,
  karaokeWords,
  audioSrc,
  totalDurationInFrames,
  hookFrames,
  brandTag,
  width,
  height,
  showNiche,
  showProgress,
  scenes,
  utterances,
  audioTracks,
}) => {
  const frame = useCurrentFrame();
  const unit = Math.min(width, height) / 1080;
  const isHookActive = frame < hookFrames;
  const hookOpacity = interpolate(frame, [hookFrames - 10, hookFrames], [1, 0], clamp);

  const chunks = useMemo(() => chunkCaptions(karaokeWords.map((w) => w.word)), [karaokeWords]);
  let activeIdx = -1;
  if (!isHookActive && karaokeWords.length > 0) {
    activeIdx = karaokeWords.findIndex((w) => frame >= w.startFrame && frame <= w.endFrame);
    if (activeIdx === -1) {
      for (let i = karaokeWords.length - 1; i >= 0; i--) {
        if (karaokeWords[i].startFrame <= frame) {
          activeIdx = i;
          break;
        }
      }
    }
  }
  const chunk = activeIdx !== -1 ? chunkAt(chunks, activeIdx) : undefined;
  // Qui parle : le héros de la réplique en cours (mode histoire), ou le personnage principal (mode simple).
  const speaking = activeIdx !== -1 && frame <= (karaokeWords[activeIdx]?.endFrame ?? 0);
  const speakingKey = utterances
    ? (utterances.find((u) => frame >= u.startFrame && frame < u.endFrame)?.speaker ?? null)
    : speaking
      ? 'main'
      : null;
  // Bouche : ouverture selon les voyelles du mot prononcé, avec un léger mouvement.
  const spokenWord = activeIdx !== -1 ? karaokeWords[activeIdx].word : '';
  const mouth = speakingKey ? visemeOpen(spokenWord) * (0.85 + 0.15 * Math.sin(frame * 1.7)) : 0;
  const progressPercent = Math.min(100, Math.max(0, (frame / Math.max(1, totalDurationInFrames)) * 100));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={scene.from} durationInFrames={scene.durationInFrames}>
          <SceneView scene={scene} width={width} height={height} utterances={utterances} />
        </Sequence>
      ))}

      {audioTracks
        ? audioTracks.map((track, i) => (
            <Sequence key={`audio-${i}`} from={track.fromFrame} durationInFrames={track.durationInFrames}>
              <Audio src={resolveSrc(track.src)} />
            </Sequence>
          ))
        : audioSrc
          ? <Audio src={resolveSrc(audioSrc)} />
          : null}

      {/* Accroche : gros titre en haut, pendant les premières secondes */}
      {isHookActive ? (
        <div
          style={{
            position: 'absolute',
            top: height * 0.1,
            left: 60 * unit,
            right: 60 * unit,
            textAlign: 'center',
            opacity: hookOpacity,
            color: '#FFFFFF',
            fontSize: 78 * unit,
            fontWeight: 900,
            lineHeight: 1.1,
            textShadow: `0 ${6 * unit}px 0 #000, ${4 * unit}px 0 0 #000, -${4 * unit}px 0 0 #000`,
          }}
        >
          {hookText}
        </div>
      ) : null}

      {/* Sous-titres : le mot prononcé est en jaune */}
      {chunk && !isHookActive ? (
        <div
          style={{
            position: 'absolute',
            left: 50 * unit,
            right: 50 * unit,
            bottom: height * 0.2,
            textAlign: 'center',
            fontSize: 58 * unit,
            fontWeight: 900,
            lineHeight: 1.2,
            textTransform: 'uppercase',
            textShadow: `0 ${5 * unit}px 0 #000, ${3 * unit}px 0 0 #000, -${3 * unit}px 0 0 #000`,
          }}
        >
          {karaokeWords.slice(chunk.first, chunk.last + 1).map((w, i) => {
            const isActive = chunk.first + i === activeIdx;
            return (
              <span key={chunk.first + i} style={{ color: isActive ? '#FFE14D' : '#FFFFFF', marginRight: 10 * unit }}>
                {w.word}
              </span>
            );
          })}
        </div>
      ) : null}

      {showNiche ? (
        <div
          style={{
            position: 'absolute',
            top: height * 0.04,
            left: 40 * unit,
            padding: `${8 * unit}px ${18 * unit}px`,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.6)',
            color: '#FFFFFF',
            fontSize: 30 * unit,
            fontWeight: 800,
          }}
        >
          {nicheName}
        </div>
      ) : null}

      {brandTag ? (
        <div
          style={{ position: 'absolute', top: height * 0.04, right: 40 * unit, color: '#FFFFFF', fontSize: 32 * unit, fontWeight: 900 }}
        >
          {brandTag}
        </div>
      ) : null}

      {showProgress ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8 * unit, background: 'rgba(255,255,255,0.2)' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: '#FFE14D' }} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
