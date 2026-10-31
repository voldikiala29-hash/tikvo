import React from 'react';
import { interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio, Video } from '@remotion/media';
import type { ViralTemplateProps } from './types.ts';
import { planSegments } from './timeline.ts';

/** URL https telle quelle ; sinon fichier du dossier public (rendu serveur). */
const resolveSrc = (src: string): string => (/^(https?:)?\/\//.test(src) ? src : staticFile(src));

const ClipSegment: React.FC<{ src: string; durationInFrames: number; index: number }> = ({
  src,
  durationInFrames,
  index,
}) => {
  const frame = useCurrentFrame();
  // Ken Burns : un plan sur deux zoome, l'autre dézoome.
  const zoomIn = index % 2 === 0;
  const scale = interpolate(frame, [0, Math.max(1, durationInFrames)], zoomIn ? [1.0, 1.14] : [1.14, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', transform: `scale(${scale})` }}>
        <Video
          src={resolveSrc(src)}
          muted
          loop
          objectFit="cover"
          style={{ width: '100%', height: '100%', filter: 'brightness(0.85) contrast(1.1)' }}
        />
      </div>
    </div>
  );
};

const KaraokeWordView: React.FC<{ word: string; active: boolean }> = ({ word, active }) => (
  <span
    style={{
      fontSize: 68,
      fontWeight: 900,
      textTransform: 'uppercase',
      color: active ? '#00FFC6' : '#FFFFFF',
      textShadow: active
        ? '0 0 25px rgba(0, 255, 198, 0.8), -3px -3px 0 #000, 3px 3px 0 #000'
        : '-3px -3px 0 #000, 3px 3px 0 #000',
      transform: active ? 'scale(1.08)' : 'scale(1.0)',
    }}
  >
    {word}
  </span>
);

export const ViralTemplate: React.FC<ViralTemplateProps> = ({
  hookText,
  nicheName,
  clips,
  karaokeWords,
  audioSrc,
  totalDurationInFrames,
  hookFrames = 90,
  brandTag,
  showNiche = true,
  showProgress = true,
}) => {
  const frame = useCurrentFrame();

  // 1. Hook : énorme texte blanc à contour noir, animé de 0.8 à 1.1.
  const isHookActive = frame < hookFrames;
  const hookScale = interpolate(frame, [0, 20, hookFrames - 10, hookFrames], [0.8, 1.1, 1.05, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hookOpacity = interpolate(frame, [hookFrames - 10, hookFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Sous-titres karaoké : deux mots à la fois, mot courant en cyan.
  let pair: { word1: string; word2: string; active: 1 | 2 } | null = null;
  if (!isHookActive && karaokeWords.length > 0) {
    let idx = karaokeWords.findIndex((w) => frame >= w.startFrame && frame <= w.endFrame);
    if (idx === -1) {
      // Entre deux mots : on garde le dernier mot déjà prononcé.
      for (let i = karaokeWords.length - 1; i >= 0; i--) {
        if (karaokeWords[i].startFrame <= frame) {
          idx = i;
          break;
        }
      }
    }
    if (idx !== -1) {
      const first = idx % 2 === 0 ? idx : idx - 1;
      pair = {
        word1: karaokeWords[first]?.word ?? '',
        word2: karaokeWords[first + 1]?.word ?? '',
        active: idx % 2 === 0 ? 1 : 2,
      };
    }
  }

  // 3. Barre de progression.
  const progressPercent = Math.min(100, Math.max(0, (frame / Math.max(1, totalDurationInFrames)) * 100));

  const segments = planSegments(totalDurationInFrames, clips.length || 1);

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: '#08080D',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Fond de secours si aucun clip n'est disponible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, #1a1033 0%, #08080D 55%, #07241f 100%)',
        }}
      />

      {/* Plans vidéo successifs (Ken Burns) */}
      {clips.map((clip, i) => (
        <Sequence key={`${clip.id}-${i}`} from={segments[i].from} durationInFrames={segments[i].durationInFrames}>
          <ClipSegment src={clip.src} durationInFrames={segments[i].durationInFrames} index={i} />
        </Sequence>
      ))}

      {/* Voix off */}
      {audioSrc ? <Audio src={resolveSrc(audioSrc)} /> : null}

      {/* Vignettage pour la lisibilité */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(8, 8, 13, 0.75) 100%), linear-gradient(to bottom, rgba(8,8,13,0.5) 0%, transparent 25%, transparent 70%, rgba(8,8,13,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {brandTag ? (
      <div
        style={{
          position: 'absolute',
          top: 90,
          right: 70,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 24px',
          borderRadius: 24,
          backgroundColor: 'rgba(18, 18, 26, 0.75)',
          border: '1px solid rgba(0, 255, 198, 0.3)',
          boxShadow: '0 0 25px rgba(0, 255, 198, 0.25)',
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: '#00FFC6',
            boxShadow: '0 0 10px #00FFC6',
          }}
        />
        <span style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 900, letterSpacing: '1px' }}>{brandTag}</span>
      </div>
      ) : null}

      {/* Badge niche */}
      {showNiche ? (
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 70,
          padding: '10px 24px',
          borderRadius: 24,
          backgroundColor: 'rgba(18, 18, 26, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#00FFC6',
          fontSize: 28,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}
      >
        # {nicheName}
      </div>
      ) : null}

      {/* Hook */}
      {isHookActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 90px',
            opacity: hookOpacity,
            transform: `scale(${hookScale})`,
            zIndex: 30,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-1px',
              textShadow: `
                -5px -5px 0 #000000,
                 5px -5px 0 #000000,
                -5px  5px 0 #000000,
                 5px  5px 0 #000000,
                -6px  0px 0 #000000,
                 6px  0px 0 #000000,
                 0px -6px 0 #000000,
                 0px  6px 0 #000000,
                 0px 18px 35px rgba(0, 0, 0, 0.9)
              `,
              background: 'rgba(0,0,0,0.3)',
              padding: '40px 50px',
              borderRadius: 36,
              border: '2px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            {hookText}
          </div>
        </div>
      )}

      {/* Sous-titres karaoké */}
      {!isHookActive && pair && (
        <div
          style={{
            position: 'absolute',
            bottom: 380,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 30,
            padding: '0 60px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 24,
              backgroundColor: 'rgba(8, 8, 13, 0.85)',
              padding: '24px 44px',
              borderRadius: 32,
              border: '2px solid rgba(0, 255, 198, 0.4)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 198, 0.2)',
            }}
          >
            {pair.word1 && <KaraokeWordView word={pair.word1} active={pair.active === 1} />}
            {pair.word2 && <KaraokeWordView word={pair.word2} active={pair.active === 2} />}
          </div>
        </div>
      )}

      {showProgress ? (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 18,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          zIndex: 40,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #7C3AED 0%, #FF2E93 80%, #00FFC6 100%)',
            boxShadow: '0 0 20px #FF2E93',
          }}
        />
      </div>
      ) : null}
    </div>
  );
};
