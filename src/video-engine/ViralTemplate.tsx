import React from 'react';
import {
  interpolate,
  useCurrentFrame,
  Sequence,
  spring,
  useVideoConfig,
} from 'remotion';
import { ViralTemplateProps } from './types';

export const ViralTemplate: React.FC<ViralTemplateProps> = ({
  hookText,
  scriptText,
  nicheName,
  clips,
  karaokeWords = [],
  musicUrl,
  totalDurationInFrames = 900, // 30 seconds at 30fps
  brandTag = 'tikvo',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. Hook 0-3s (Frames 0 to 90): ÉNORME texte blanc, contour noir, animé scale 0.8 -> 1.1
  const isHookActive = frame < 90;
  const hookScale = interpolate(frame, [0, 20, 80, 90], [0.8, 1.1, 1.05, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const hookOpacity = interpolate(frame, [80, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Ken Burns Zoom for the 3 sequential clips (Frames 0-300, 300-600, 600-900)
  const clip1Scale = interpolate(frame, [0, 300], [1.0, 1.18], {
    extrapolateRight: 'clamp',
  });
  const clip2Scale = interpolate(frame, [300, 600], [1.18, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const clip3Scale = interpolate(frame, [600, 900], [1.02, 1.22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Karaoke Subtitles (2 words at a time, current word highlighted in cyan #00FFC6)
  // Find current karaoke word based on frame
  const currentWordIndex = karaokeWords.findIndex(
    (w) => frame >= w.startFrame && frame <= w.endFrame
  );

  let displayedPair: { word1: string; word2: string; activeIdx: 1 | 2 } | null = null;
  if (!isHookActive && currentWordIndex !== -1) {
    const isEven = currentWordIndex % 2 === 0;
    const firstIdx = isEven ? currentWordIndex : currentWordIndex - 1;
    const secondIdx = firstIdx + 1;

    displayedPair = {
      word1: karaokeWords[firstIdx]?.word || '',
      word2: karaokeWords[secondIdx]?.word || '',
      activeIdx: isEven ? 1 : 2,
    };
  } else if (!isHookActive && karaokeWords.length > 0 && frame >= 90) {
    // Fallback if between words: show closest pair
    const targetIdx = Math.min(
      karaokeWords.length - 1,
      Math.floor(((frame - 90) / (totalDurationInFrames - 90)) * karaokeWords.length)
    );
    const isEven = targetIdx % 2 === 0;
    const firstIdx = isEven ? targetIdx : targetIdx - 1;
    displayedPair = {
      word1: karaokeWords[firstIdx]?.word || '',
      word2: karaokeWords[firstIdx + 1]?.word || '',
      activeIdx: 1,
    };
  }

  // 4. Progress bar pink #FF2E93 at bottom
  const progressPercent = Math.min(100, Math.max(0, (frame / totalDurationInFrames) * 100));

  // 5. Music Ducking calculation
  // When voice/hook is active, music volume drops from 1.0 to 0.25
  const musicVolume = isHookActive || displayedPair ? 0.25 : 0.85;

  const clip1 = clips[0] || { url: '', thumbnailUrl: '' };
  const clip2 = clips[1] || { url: '', thumbnailUrl: '' };
  const clip3 = clips[2] || { url: '', thumbnailUrl: '' };

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
      {/* 3 Sequential Video Clips with Ken Burns */}
      {/* Clip 1: 0 to 300 frames */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'absolute',
          }}
        >
          <img
            src={clip1.thumbnailUrl}
            alt="Clip 1"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${clip1Scale})`,
              filter: 'brightness(0.85) contrast(1.1)',
            }}
          />
        </div>
      </Sequence>

      {/* Clip 2: 300 to 600 frames */}
      <Sequence from={300} durationInFrames={300}>
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'absolute',
          }}
        >
          <img
            src={clip2.thumbnailUrl}
            alt="Clip 2"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${clip2Scale})`,
              filter: 'brightness(0.85) contrast(1.1)',
            }}
          />
        </div>
      </Sequence>

      {/* Clip 3: 600 to 900 frames */}
      <Sequence from={600} durationInFrames={300}>
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'absolute',
          }}
        >
          <img
            src={clip3.thumbnailUrl}
            alt="Clip 3"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${clip3Scale})`,
              filter: 'brightness(0.85) contrast(1.1)',
            }}
          />
        </div>
      </Sequence>

      {/* Dark Vignette Overlay for maximum text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 40%, rgba(8, 8, 13, 0.75) 100%), linear-gradient(to bottom, rgba(8,8,13,0.5) 0%, transparent 25%, transparent 70%, rgba(8,8,13,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Brand Watermark (tikvo neon cyan) */}
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
          backdropFilter: 'blur(12px)',
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
        <span
          style={{
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: '1px',
          }}
        >
          {brandTag}
        </span>
      </div>

      {/* Top Left Niche Badge */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 70,
          padding: '10px 24px',
          borderRadius: 24,
          backgroundColor: 'rgba(18, 18, 26, 0.75)',
          backdropFilter: 'blur(12px)',
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

      {/* 1. HOOK 0-3s: ÉNORME BLANC CONTOUR NOIR ANIMÉ SCALE 0.8 -> 1.1 */}
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
              backdropFilter: 'blur(8px)',
            }}
          >
            {hookText}
          </div>
        </div>
      )}

      {/* 2. SOUS-TITRES KARAOKÉ (2 mots à la fois, mot actuel en cyan #00FFC6) */}
      {!isHookActive && displayedPair && (
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
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Word 1 */}
            {displayedPair.word1 && (
              <span
                style={{
                  fontSize: 68,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: displayedPair.activeIdx === 1 ? '#00FFC6' : '#FFFFFF',
                  textShadow:
                    displayedPair.activeIdx === 1
                      ? '0 0 25px rgba(0, 255, 198, 0.8), -3px -3px 0 #000, 3px 3px 0 #000'
                      : '-3px -3px 0 #000, 3px 3px 0 #000',
                  transform: displayedPair.activeIdx === 1 ? 'scale(1.08)' : 'scale(1.0)',
                  transition: 'all 0.1s ease',
                }}
              >
                {displayedPair.word1}
              </span>
            )}

            {/* Word 2 */}
            {displayedPair.word2 && (
              <span
                style={{
                  fontSize: 68,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: displayedPair.activeIdx === 2 ? '#00FFC6' : '#FFFFFF',
                  textShadow:
                    displayedPair.activeIdx === 2
                      ? '0 0 25px rgba(0, 255, 198, 0.8), -3px -3px 0 #000, 3px 3px 0 #000'
                      : '-3px -3px 0 #000, 3px 3px 0 #000',
                  transform: displayedPair.activeIdx === 2 ? 'scale(1.08)' : 'scale(1.0)',
                  transition: 'all 0.1s ease',
                }}
              >
                {displayedPair.word2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. BARRE DE PROGRESSION ROSE #FF2E93 EN BAS */}
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
            transition: 'width 0.05s linear',
          }}
        />
      </div>
    </div>
  );
};
