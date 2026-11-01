// Montage dessin animé : décor par plan, personnages placés, voix off et sous-titres mot par mot.
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { chunkAt, chunkCaptions } from '../captions.ts';
import { Character } from './Character.tsx';
import { CartoonSet } from './Sets.tsx';
import type { CartoonProps, CartoonScene } from './props.ts';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const resolveSrc = (src: string): string => (/^(https?:)?\/\//.test(src) ? src : staticFile(src));

const SceneView: React.FC<{ scene: CartoonScene; width: number; height: number; mouth: number }> = ({ scene, width, height, mouth }) => {
  const floorY = height * 0.66;
  const charHeight = height * 0.2;
  return (
    <AbsoluteFill>
      <CartoonSet set={scene.set} />
      {scene.actors.map((actor, i) => {
        const h = charHeight * actor.scale;
        const w = (h * 200) / 360;
        return (
          <div
            key={`${actor.characterId}-${i}`}
            style={{
              position: 'absolute',
              left: actor.x * width - w / 2,
              top: floorY - h,
              width: w,
              height: h,
            }}
          >
            <Character
              characterId={actor.characterId}
              expression={actor.expression}
              mouthOpen={actor.speaking ? mouth : 0}
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
  // La bouche du personnage principal bouge pendant qu'on prononce un mot.
  const speaking = activeIdx !== -1 && frame <= (karaokeWords[activeIdx]?.endFrame ?? 0);
  const mouth = speaking ? 0.5 + 0.5 * Math.sin(frame * 1.7) : 0;
  const progressPercent = Math.min(100, Math.max(0, (frame / Math.max(1, totalDurationInFrames)) * 100));

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={scene.from} durationInFrames={scene.durationInFrames}>
          <SceneView scene={scene} width={width} height={height} mouth={mouth} />
        </Sequence>
      ))}

      {audioSrc ? <Audio src={resolveSrc(audioSrc)} /> : null}

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
