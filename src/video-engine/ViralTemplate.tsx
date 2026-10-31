import React, { useMemo } from 'react';
import { interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio, Video } from '@remotion/media';
import type { MontageConfig, ViralTemplateProps } from './types.ts';
import { planSegments } from './timeline.ts';
import { chunkAt, chunkCaptions } from './captions.ts';

/** URL https telle quelle ; sinon fichier du dossier public (rendu serveur). */
const resolveSrc = (src: string): string => (/^(https?:)?\/\//.test(src) ? src : staticFile(src));

const FALLBACK_MONTAGE: MontageConfig = {
  transitionFrames: 0,
  zoom: 1.14,
  filter: 'brightness(0.9) contrast(1.1)',
  vignette: true,
  letterbox: false,
  subtitles: 'bottom',
  hookPosition: 'center',
  accent: '#00FFC6',
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Un plan : zoom progressif, et fondu d'entrée sur les `overlap` premières frames (il chevauche le plan précédent). */
const ClipLayer: React.FC<{
  src: string;
  index: number;
  span: number;
  overlap: number;
  zoom: number;
  filter: string;
}> = ({ src, index, span, overlap, zoom, filter }) => {
  const f = useCurrentFrame();
  const zoomIn = index % 2 === 0;
  const scale = interpolate(f, [0, Math.max(1, span)], zoomIn ? [1, zoom] : [zoom, 1], clamp);
  const opacity = overlap > 0 ? interpolate(f, [0, overlap], [0, 1], clamp) : 1;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity }}>
      <div style={{ width: '100%', height: '100%', transform: `scale(${scale})` }}>
        <Video src={resolveSrc(src)} muted loop objectFit="cover" style={{ width: '100%', height: '100%', filter }} />
      </div>
    </div>
  );
};

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
  width = 1080,
  height = 1920,
  montage = FALLBACK_MONTAGE,
  scenes,
}) => {
  const frame = useCurrentFrame();
  const vertical = height >= width;
  const unit = Math.min(width, height) / 1080;
  const bottomInset = vertical ? height * 0.2 : height * 0.13;

  // 1. Accroche : grand texte animé au début.
  const isHookActive = frame < hookFrames;
  const hookScale = interpolate(frame, [0, 20, hookFrames - 10, hookFrames], [0.8, 1.1, 1.05, 0.95], clamp);
  const hookOpacity = interpolate(frame, [hookFrames - 10, hookFrames], [1, 0], clamp);

  // 2. Sous-titres : phrases courtes coupées aux fins de phrase ; le mot prononcé se distingue en couleur d'accent.
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
  const captionFade = chunk
    ? interpolate(frame, [karaokeWords[chunk.first].startFrame, karaokeWords[chunk.first].startFrame + 6], [0, 1], clamp)
    : 0;

  // 3. Progression.
  const progressPercent = Math.min(100, Math.max(0, (frame / Math.max(1, totalDurationInFrames)) * 100));

  // 4. Plans : fondu de transition (le plan suivant commence un peu plus tôt, il se superpose).
  const segments = scenes && scenes.length === clips.length ? scenes : planSegments(totalDurationInFrames, clips.length || 1);
  const fade = montage.transitionFrames;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#08080D',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Fond de secours si aucun clip n'est disponible */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1a1033 0%, #08080D 55%, #07241f 100%)' }} />

      {/* Plans */}
      {clips.map((clip, i) => {
        const seg = segments[i];
        const overlap = i === 0 ? 0 : Math.min(fade, Math.floor(seg.durationInFrames / 3));
        const from = Math.max(0, seg.from - overlap);
        const span = seg.durationInFrames + (seg.from - from);
        return (
          <Sequence key={`${clip.id}-${i}`} from={from} durationInFrames={span}>
            <ClipLayer
              src={clip.src}
              index={i}
              span={span}
              overlap={overlap}
              zoom={montage.zoom}
              filter={montage.filter}
            />
          </Sequence>
        );
      })}

      {/* Voix off */}
      {audioSrc ? <Audio src={resolveSrc(audioSrc)} /> : null}

      {/* Étalonnage final : dégradés de lisibilité et vignettage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            montage.vignette ? 'radial-gradient(circle at center, transparent 45%, rgba(8, 8, 13, 0.7) 100%)' : '',
            'linear-gradient(to bottom, rgba(8,8,13,0.45) 0%, transparent 22%, transparent 66%, rgba(8,8,13,0.85) 100%)',
          ]
            .filter(Boolean)
            .join(', '),
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Bandes cinéma */}
      {montage.letterbox ? (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.08, backgroundColor: '#000', zIndex: 12 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.08, backgroundColor: '#000', zIndex: 12 }} />
        </>
      ) : null}

      {/* Marque (optionnelle) */}
      {brandTag ? (
        <div
          style={{
            position: 'absolute',
            top: vertical ? 90 * unit : height * 0.06,
            right: vertical ? 70 * unit : width * 0.04,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 24px',
            borderRadius: 24,
            backgroundColor: 'rgba(18, 18, 26, 0.75)',
            border: `1px solid ${montage.accent}55`,
            zIndex: 20,
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: montage.accent, boxShadow: `0 0 10px ${montage.accent}` }} />
          <span style={{ color: '#FFFFFF', fontSize: 32 * unit, fontWeight: 900, letterSpacing: '1px' }}>{brandTag}</span>
        </div>
      ) : null}

      {/* Badge de niche (optionnel) */}
      {showNiche ? (
        <div
          style={{
            position: 'absolute',
            top: vertical ? 90 * unit : height * 0.06,
            left: vertical ? 70 * unit : width * 0.04,
            padding: '10px 24px',
            borderRadius: 24,
            backgroundColor: 'rgba(18, 18, 26, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: montage.accent,
            fontSize: 28 * unit,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            zIndex: 20,
          }}
        >
          {nicheName}
        </div>
      ) : null}

      {/* Accroche */}
      {isHookActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: montage.hookPosition === 'top' ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: montage.hookPosition === 'top' ? `${height * 0.16}px 90px 0` : '0 90px',
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
              fontSize: 88 * unit,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-1px',
              textShadow: '0 0 0 #000, -5px -5px 0 #000, 5px -5px 0 #000, -5px 5px 0 #000, 5px 5px 0 #000, 0 18px 35px rgba(0, 0, 0, 0.9)',
              background: 'rgba(0,0,0,0.35)',
              padding: '40px 50px',
              borderRadius: 36,
              borderTop: `3px solid ${montage.accent}`,
            }}
          >
            {hookText}
          </div>
        </div>
      )}

      {/* Sous-titres : lisibles, sans majuscules criardes, sur un fond discret */}
      {chunk && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(montage.subtitles === 'center' ? { top: '50%', transform: 'translateY(-50%)' } : { bottom: bottomInset }),
            display: 'flex',
            justifyContent: 'center',
            zIndex: 30,
            padding: `0 ${70 * unit}px`,
            opacity: captionFade,
          }}
        >
          <div
            style={{
              maxWidth: '100%',
              backgroundColor: 'rgba(8, 8, 13, 0.62)',
              borderRadius: 18 * unit,
              padding: `${14 * unit}px ${30 * unit}px`,
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              style={{
                fontSize: 50 * unit,
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '0.2px',
                color: '#FFFFFF',
                textAlign: 'center',
                textShadow: '0 2px 6px rgba(0, 0, 0, 0.6)',
              }}
            >
              {karaokeWords.slice(chunk.first, chunk.last + 1).map((w, i) => {
                const active = chunk.first + i === activeIdx;
                return (
                  <span
                    key={`${chunk.first + i}-${w.word}`}
                    style={{ color: active ? montage.accent : '#FFFFFF', fontWeight: active ? 800 : 600 }}
                  >
                    {w.word}
                    {i < chunk.last - chunk.first ? ' ' : ''}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Progression */}
      {showProgress ? (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14 * unit, backgroundColor: 'rgba(255, 255, 255, 0.12)', zIndex: 40 }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${montage.accent} 0%, #7C3AED 100%)`,
              boxShadow: `0 0 16px ${montage.accent}`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
