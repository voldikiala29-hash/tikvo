// Template « Replica / Motion » : fond bleu nuit à grille en perspective, halo orange, cartes blanches,
// iPhone flottant, fenêtre terminal. Styles inline (comme les autres compositions) pour un rendu serveur fiable.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  REEL_SCENES,
  REVIEW_COUNT,
  gridSkills,
  hookHighlight,
  totalPrice,
  type ReelProps,
  type ReelScene,
} from './props.ts';

const ORANGE = '#FF6A2B';
const NAVY_TOP = '#070B25';
const NAVY_BOTTOM = '#0F1A3D';
const INK = '#0F1A3D';
const SANS = 'Inter, Helvetica, Arial, sans-serif';
const MONO = '"JetBrains Mono", Menlo, Consolas, monospace';

/** Valeur pseudo-aléatoire stable (même résultat à chaque rendu). */
const rand = (n: number): number => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Entrée à ressort (damping 200), décalée de `delay` frames. Fonction pure : utilisable dans des boucles. */
function enterAt(frame: number, fps: number, delay = 0): number {
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
}

/** Entrée à ressort pour le segment courant. */
function useEnter(delay = 0): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return enterAt(frame, fps, delay);
}

function Background(): React.ReactElement {
  // Point de fuite au centre : les lignes horizontales se resserrent vers l'horizon.
  const hLines = Array.from({ length: 14 }, (_, k) => 960 + 960 * ((k + 1) / 14) ** 2);
  const vLines = Array.from({ length: 21 }, (_, k) => k - 10);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${NAVY_TOP}, ${NAVY_BOTTOM})`, overflow: 'hidden' }}>
      <svg viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }}>
        {hLines.map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={1080} y2={y} stroke="#8FA6FF" strokeWidth={2} />
        ))}
        {vLines.map((i) => (
          <line key={`v${i}`} x1={540} y1={960} x2={540 + i * 220} y2={1920} stroke="#8FA6FF" strokeWidth={2} />
        ))}
      </svg>
      <Glow x={540} y={900} size={820} />
    </AbsoluteFill>
  );
}

/** Halo orange flou derrière un élément principal (blur 200 px). */
function Glow({ x, y, size }: { x: number; y: number; size: number }): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${ORANGE} 0%, rgba(255,106,43,0) 70%)`,
        opacity: 0.45,
        filter: 'blur(200px)',
      }}
    />
  );
}

/** Carte blanche standard. */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** iPhone flottant, en perspective ; `children` est l'écran. */
function IPhone({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div
      style={{
        width: 460,
        height: 940,
        background: '#05070F',
        border: '8px solid #15151C',
        borderRadius: 60,
        padding: 18,
        boxSizing: 'border-box',
        transform: 'perspective(1000px) rotateY(-15deg) rotateX(5deg)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: 44, background: '#EEF2FA', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

/** Fenêtre terminal : barre supérieure à trois points, texte en police monospace. */
function Terminal({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ background: '#121212', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', ...style }}>
      <div style={{ display: 'flex', gap: 10, padding: '14px 18px', background: '#1E1E1E' }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <span key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ padding: 28, fontFamily: MONO, color: '#E6E6E6', fontSize: 34, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}

/** Texte qui se tape : nombre de caractères visibles selon la frame. */
function typed(text: string, frame: number, startFrame: number, framesPerChar: number): string {
  const count = Math.max(0, Math.min(text.length, Math.floor((frame - startFrame) / framesPerChar)));
  return text.slice(0, count);
}

function Hook({ hook, appName }: { hook: string; appName: string }): React.ReactElement {
  const frame = useCurrentFrame();
  const { before, keyword } = hookHighlight(hook);
  const titleIn = useEnter(4);
  // Le téléphone se duplique : deux copies fantômes s'écartent du centre.
  const ghostLeft = useEnter(18) * -220;
  const ghostRight = useEnter(22) * 220;
  const phoneIn = useEnter(0);
  // Particules orange qui se dissolvent pendant la première seconde.
  const dissolve = interpolate(frame, [0, 45], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      {Array.from({ length: 60 }, (_, i) => {
        const x = rand(i) * 1080;
        const y = rand(i + 100) * 1920;
        const drift = (frame / 30) * 60 * rand(i + 200);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y - drift,
              width: 8 + rand(i + 300) * 10,
              height: 8 + rand(i + 300) * 10,
              borderRadius: '50%',
              background: ORANGE,
              opacity: dissolve * 0.8,
            }}
          />
        );
      })}
      <Glow x={540} y={1050} size={900} />
      <div style={{ position: 'absolute', left: 60, right: 60, top: 170, textAlign: 'center', opacity: titleIn, transform: `translateY(${(1 - titleIn) * 40}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 64, lineHeight: 0.9, color: '#FFFFFF' }}>
          {before && <span>{before} </span>}
          <span style={{ background: ORANGE, borderRadius: 999, padding: '4px 18px' }}>{keyword}</span>
        </div>
      </div>
      <IPhone style={{ position: 'absolute', left: 310, top: 560, transform: 'perspective(1000px) rotateY(-15deg) rotateX(5deg)', opacity: 0.35 + 0.65 * phoneIn }} />
      <IPhone style={{ position: 'absolute', left: 310 + ghostLeft, top: 560, opacity: 0.4 }} />
      <IPhone style={{ position: 'absolute', left: 310 + ghostRight, top: 560, opacity: 0.4 }} />
      <div style={{ position: 'absolute', left: 60, right: 60, bottom: 220, textAlign: 'center', fontFamily: SANS, fontSize: 36, color: '#B9C4E8' }}>
        {appName}
      </div>
    </AbsoluteFill>
  );
}

function Pain({ priceItems }: { priceItems: ReelProps['priceItems'] }): React.ReactElement {
  const total = totalPrice(priceItems);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const totalIn = useEnter(8 * priceItems.length + 6);
  return (
    <AbsoluteFill>
      <Glow x={540} y={900} size={800} />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 240, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {priceItems.map((item, i) => {
          const e = enterAt(frame, fps, i * 8);
          return (
            <Card key={`${item.name}-${i}`} style={{ padding: '36px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: e, transform: `translateX(${(1 - e) * 200}px)` }}>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: INK }}>{item.name}</span>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: INK }}>{item.price} €</span>
            </Card>
          );
        })}
        <Card style={{ padding: '40px', textAlign: 'center', opacity: totalIn, transform: `scale(${0.9 + 0.1 * totalIn})` }}>
          <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 56, color: INK }}>Total : {total} € / mois</span>
        </Card>
      </div>
    </AbsoluteFill>
  );
}

function Solution({ appName, skills }: { appName: string; skills: string[] }): React.ReactElement {
  const frame = useCurrentFrame();
  const list = gridSkills(skills);
  const progress = interpolate(frame, [0, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visible = Math.max(1, Math.min(list.length, Math.round(1 + (list.length - 1) * progress)));
  const { fps } = useVideoConfig();
  const windowIn = useEnter(0);
  return (
    <AbsoluteFill>
      <Glow x={540} y={960} size={820} />
      <Card style={{ position: 'absolute', left: 80, right: 80, top: 200, padding: 0, overflow: 'hidden', opacity: windowIn, transform: `translateY(${(1 - windowIn) * 60}px)` }}>
        <div style={{ padding: '18px 24px', background: '#E8ECF5', fontFamily: MONO, fontSize: 28, color: INK }}>github.com/{appName.toLowerCase()}/replica</div>
        <div style={{ padding: 40, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: INK }}>
          Une skill par fonction <span style={{ color: ORANGE }}>x{visible}</span>
        </div>
      </Card>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 720, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {list.map((skill, i) => {
          const e = i < visible ? enterAt(frame, fps, i * 4) : 0;
          return (
            <Card key={`${skill}-${i}`} style={{ padding: '36px 20px', textAlign: 'center', opacity: i < visible ? 1 : 0.15, transform: `scale(${0.85 + 0.15 * e})` }}>
              <span style={{ fontFamily: MONO, fontSize: 30, color: INK }}>{skill}</span>
            </Card>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Demo({ appName }: { appName: string }): React.ReactElement {
  const frame = useCurrentFrame();
  const command = ` > /replica-recon ${appName}`;
  const typing = typed(command, frame, 0, 2);
  const barStart = 90;
  const bar = interpolate(frame, [barStart, barStart + 120], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const splitIn = useEnter(210);
  return (
    <AbsoluteFill>
      <Glow x={540} y={900} size={820} />
      <Terminal style={{ position: 'absolute', left: 60, right: 60, top: 220 }}>
        <div>
          {typing}
          <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>▍</span>
        </div>
        <div style={{ marginTop: 28, height: 22, borderRadius: 11, background: '#2A2A2A', overflow: 'hidden' }}>
          <div style={{ width: `${bar}%`, height: '100%', background: ORANGE }} />
        </div>
        <div style={{ marginTop: 14, color: '#9AA3B2' }}>{Math.round(bar)} %</div>
      </Terminal>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 760, display: 'flex', gap: 24, opacity: splitIn, transform: `translateY(${(1 - splitIn) * 80}px)` }}>
        <Card style={{ flex: 1, padding: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: INK }}>ORIGINAL</div>
          <div style={{ marginTop: 20, height: 420, borderRadius: 12, background: '#E8ECF5' }} />
        </Card>
        <Card style={{ flex: 1, padding: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: ORANGE }}>TON CLONE</div>
          <div style={{ marginTop: 20, height: 420, borderRadius: 12, background: '#FFE6DA' }} />
        </Card>
      </div>
    </AbsoluteFill>
  );
}

function Twist(): React.ReactElement {
  const frame = useCurrentFrame();
  const count = Math.round(interpolate(frame, [0, 120], [0, REVIEW_COUNT], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const sources = [
    { label: 'App Store', value: 620 },
    { label: 'Reddit', value: 380 },
    { label: 'G2', value: 241 },
  ];
  const titleIn = useEnter(0);
  return (
    <AbsoluteFill>
      <Glow x={540} y={960} size={820} />
      <Card style={{ position: 'absolute', left: 80, right: 80, top: 260, padding: 48, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 60}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 64, lineHeight: 0.9, color: INK }}>Rapport {count} avis</div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {sources.map((src, i) => {
            const largest = Math.max(...sources.map((x) => x.value));
            const fill = interpolate(frame, [20 + i * 12, 80 + i * 12], [0, (src.value / largest) * 100], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div key={src.label}>
                <div style={{ fontFamily: SANS, fontSize: 32, color: INK }}>
                  {src.label} · {src.value}
                </div>
                <div style={{ height: 36, borderRadius: 18, background: '#E8ECF5', overflow: 'hidden' }}>
                  <div style={{ width: `${fill}%`, height: '100%', background: ORANGE, borderRadius: 18 }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </AbsoluteFill>
  );
}

function Cta({ appName, ctaKeyword }: { appName: string; ctaKeyword: string }): React.ReactElement {
  const frame = useCurrentFrame();
  const install = `$ npx skills add ${appName.toLowerCase()}`;
  const typing = typed(install, frame, 0, 2);
  const buttonIn = useEnter(60);
  return (
    <AbsoluteFill>
      <Glow x={540} y={1000} size={900} />
      <Terminal style={{ position: 'absolute', left: 60, right: 60, top: 260 }}>
        <div>
          {typing}
          <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>▍</span>
        </div>
      </Terminal>
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 900,
          background: ORANGE,
          borderRadius: 28,
          padding: '56px 40px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(255,106,43,0.5)',
          transform: `scale(${0.9 + 0.1 * buttonIn})`,
          opacity: buttonIn,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 68, lineHeight: 1.05, color: '#FFFFFF' }}>
          Écris {ctaKeyword} en commentaire
        </div>
      </div>
    </AbsoluteFill>
  );
}

const SceneFor: Record<ReelScene['name'], (p: ReelProps) => React.ReactElement> = {
  hook: (p) => <Hook hook={p.hook} appName={p.appName} />,
  pain: (p) => <Pain priceItems={p.priceItems} />,
  solution: (p) => <Solution appName={p.appName} skills={p.skills} />,
  demo: (p) => <Demo appName={p.appName} />,
  twist: () => <Twist />,
  cta: (p) => <Cta appName={p.appName} ctaKeyword={p.ctaKeyword} />,
};

export const ReelTemplate: React.FC<ReelProps> = (props) => (
  <AbsoluteFill style={{ backgroundColor: NAVY_TOP }}>
    <Background />
    {REEL_SCENES.map((scene) => (
      <Sequence key={scene.name} from={scene.from} durationInFrames={scene.durationInFrames}>
        {SceneFor[scene.name](props)}
      </Sequence>
    ))}
    {props.voiceOverUrl ? <Audio src={props.voiceOverUrl} /> : null}
  </AbsoluteFill>
);

