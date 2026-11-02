// Personnage dessiné en SVG : tête ronde blanche, yeux, sourcils, bouche selon l'émotion.
// Pas de dépendance à Remotion : utilisable dans le moteur de rendu comme sur le site.
import React from 'react';
import { characterById, type CharacterLook, type Expression, type HairStyle } from './catalog.ts';
import { REST_POSE, type Pose } from './poses.ts';
import type { Idle } from './idle.ts';

const INK = '#111111';
const STROKE = 5;

function Hair({ style, color }: { style: HairStyle; color: string }): React.ReactElement {
  switch (style) {
    case 'frange':
      return (
        <path d="M32 100 Q28 26 100 26 Q172 26 168 100 L150 66 Q100 46 52 70 Z" fill={color} stroke={INK} strokeWidth={STROKE} />
      );
    case 'chignon':
      return (
        <g fill={color} stroke={INK} strokeWidth={STROKE}>
          <circle cx={100} cy={24} r={22} />
          <path d="M34 98 Q36 34 100 34 Q164 34 166 98 Q150 62 100 60 Q50 62 34 98 Z" />
        </g>
      );
    case 'herisse':
      return (
        <path
          d="M34 96 L28 58 L48 66 L46 34 L70 46 L84 24 L100 42 L116 24 L130 46 L154 34 L152 66 L172 58 L166 96 Q150 62 100 60 Q50 62 34 96 Z"
          fill={color}
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      );
    case 'gris':
      return (
        <path d="M32 104 Q30 30 100 30 Q170 30 168 104 Q158 74 136 66 Q100 52 64 66 Q42 74 32 104 Z" fill={color} stroke={INK} strokeWidth={STROKE} />
      );
    case 'court':
    default:
      return (
        <path d="M34 96 Q36 30 100 30 Q164 30 166 96 Q150 60 100 58 Q52 60 34 96 Z" fill={color} stroke={INK} strokeWidth={STROKE} />
      );
  }
}

/** Sourcils : hauteur et inclinaison selon l'émotion. */
function Brows({ expression }: { expression: Expression }): React.ReactElement {
  const props = { stroke: INK, strokeWidth: 6, strokeLinecap: 'round' as const, fill: 'none' };
  switch (expression) {
    case 'colere':
      return (
        <g {...props}>
          <line x1={62} y1={74} x2={88} y2={86} />
          <line x1={138} y1={74} x2={112} y2={86} />
        </g>
      );
    case 'triste':
      return (
        <g {...props}>
          <line x1={62} y1={88} x2={88} y2={78} />
          <line x1={138} y1={88} x2={112} y2={78} />
        </g>
      );
    case 'surpris':
      return (
        <g {...props}>
          <line x1={62} y1={68} x2={88} y2={68} />
          <line x1={112} y1={68} x2={138} y2={68} />
        </g>
      );
    default:
      return (
        <g {...props}>
          <line x1={62} y1={80} x2={88} y2={80} />
          <line x1={112} y1={80} x2={138} y2={80} />
        </g>
      );
  }
}

/** Yeux : ouverts, fermés (joie) ou grands ouverts (surprise). */
function Eyes({ expression, blink }: { expression: Expression; blink?: boolean }): React.ReactElement {
  if (blink) {
    return (
      <g fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round">
        <path d="M66 104 Q76 110 86 104" />
        <path d="M114 104 Q124 110 134 104" />
      </g>
    );
  }
  if (expression === 'content') {
    return (
      <g fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round">
        <path d="M66 102 Q76 90 86 102" />
        <path d="M114 102 Q124 90 134 102" />
      </g>
    );
  }
  if (expression === 'surpris') {
    return (
      <g>
        <circle cx={76} cy={102} r={13} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
        <circle cx={124} cy={102} r={13} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
        <circle cx={76} cy={104} r={5} fill={INK} />
        <circle cx={124} cy={104} r={5} fill={INK} />
      </g>
    );
  }
  return (
    <g fill={INK}>
      <circle cx={76} cy={102} r={6} />
      <circle cx={124} cy={102} r={6} />
    </g>
  );
}

/** Bouche : forme selon l'émotion ; `open` (0 à 1) la transforme en bouche qui parle. */
function Mouth({ expression, open }: { expression: Expression; open: number }): React.ReactElement {
  if (open > 0.05) {
    const ry = 3 + 9 * open;
    return <ellipse cx={100} cy={138} rx={11} ry={ry} fill={INK} />;
  }
  switch (expression) {
    case 'content':
      return <path d="M84 130 Q100 152 116 130" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case 'colere':
      return (
        <g>
          <rect x={80} y={128} width={40} height={18} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
          <line x1={93} y1={128} x2={93} y2={146} stroke={INK} strokeWidth={3} />
          <line x1={107} y1={128} x2={107} y2={146} stroke={INK} strokeWidth={3} />
        </g>
      );
    case 'triste':
      return <path d="M86 146 Q100 128 114 146" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case 'surpris':
      return <ellipse cx={100} cy={138} rx={8} ry={11} fill={INK} />;
    default:
      return <line x1={88} y1={138} x2={112} y2={138} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
  }
}

export interface CharacterProps {
  characterId: string;
  expression?: Expression;
  /** 0 = bouche au repos ; entre 0 et 1 = bouche qui parle. */
  mouthOpen?: number;
  /** Pose du corps et des bras (repos par défaut). */
  pose?: Partial<Pose>;
  /** Apparence propre (héros d'une histoire) : complète ou remplace celle du catalogue. */
  look?: Partial<CharacterLook>;
  /** Hauteur en pixels (la largeur suit le dessin). */
  height?: number;
  /** Vie au repos : respiration, balancement et clignement. */
  idle?: Idle;
  style?: React.CSSProperties;
}

/** Ne garde que les valeurs renseignées, pour qu'une valeur absente ne remplace pas celle du catalogue. */
function definedOnly<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const SHOULDER_L = { x: 66, y: 186 };
const SHOULDER_R = { x: 134, y: 186 };
const ARM_LENGTH = 88;

/** Un bras : segment depuis l'épaule, angle en degrés (0 = le long du corps). */
function Arm({ shoulder, angle, side, shirt }: { shoulder: { x: number; y: number }; angle: number; side: 'L' | 'R'; shirt: string; skin: string }): React.ReactElement {
  const rad = (angle * Math.PI) / 180;
  const dir = side === 'L' ? -1 : 1;
  const end = { x: shoulder.x + dir * ARM_LENGTH * Math.sin(rad), y: shoulder.y + ARM_LENGTH * Math.cos(rad) };
  return (
    <g>
      <line x1={shoulder.x} y1={shoulder.y} x2={end.x} y2={end.y} stroke={INK} strokeWidth={26} strokeLinecap="round" />
      <line x1={shoulder.x} y1={shoulder.y} x2={end.x} y2={end.y} stroke={shirt} strokeWidth={18} strokeLinecap="round" />
      <circle cx={end.x} cy={end.y} r={11} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
    </g>
  );
}

export const Character: React.FC<CharacterProps> = ({ characterId, expression: expr, mouthOpen = 0, pose, look: custom, height = 360, idle, style }) => {
  const look: CharacterLook = { ...characterById(characterId), ...definedOnly(custom) };
  const p: Pose = { ...REST_POSE, ...pose };
  const width = (height * 200) / 360;
  const mood: Expression = expr ?? 'neutre';
  const breathY = idle ? 1.5 * idle.breath : 0;
  const swayDeg = idle ? 0.8 * idle.sway : 0;
  return (
    <svg viewBox="0 0 200 360" width={width} height={height} style={style} aria-label={look.name} overflow="visible">
      <g transform={`translate(${p.shakeX} ${p.bodyY + breathY}) rotate(${p.tilt + swayDeg} 100 300)`}>
        {/* Corps */}
        <path d="M30 360 L30 240 Q30 170 100 165 Q170 170 170 240 L170 360 Z" fill={look.shirt} stroke={INK} strokeWidth={STROKE} />
        <path d="M84 165 L100 200 L116 165" fill="#FFFFFF" stroke={INK} strokeWidth={4} />
        {look.tie && <polygon points="96,200 104,200 108,232 100,246 92,232" fill={look.tie} stroke={INK} strokeWidth={3} />}
        {/* Bras */}
        <Arm shoulder={SHOULDER_L} angle={p.armLeft} side="L" shirt={look.shirt} skin={look.skin} />
        <Arm shoulder={SHOULDER_R} angle={p.armRight} side="R" shirt={look.shirt} skin={look.skin} />
        {/* Tête */}
        <circle cx={100} cy={100} r={68} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
        <Hair style={look.hair} color={look.hairColor} />
        <Brows expression={mood} />
        <Eyes expression={mood} blink={idle?.blink} />
        {look.glasses && (
          <g fill="none" stroke={INK} strokeWidth={4}>
            <circle cx={76} cy={102} r={15} />
            <circle cx={124} cy={102} r={15} />
            <line x1={91} y1={102} x2={109} y2={102} />
          </g>
        )}
        <Mouth expression={mood} open={mouthOpen} />
        {p.tears && (
          <g fill="#7CC4F2" stroke={INK} strokeWidth={2}>
            <path d="M68 124 Q64 136 68 142 Q74 136 68 124 Z" />
            <path d="M132 124 Q128 136 132 142 Q138 136 132 124 Z" />
          </g>
        )}
      </g>
    </svg>
  );
};
