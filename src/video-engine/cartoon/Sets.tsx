// Décors dessinés en SVG, sur un cadre 1080×1920. Le sol est à 66 % de la hauteur :
// c'est là que les personnages se tiennent (voir CartoonTemplate).
import React from 'react';
import type { SetId } from './catalog.ts';

const INK = '#111111';

function Bureau(): React.ReactElement {
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill="#E9EDF3" />
      {/* Plafond : dalles lumineuses */}
      <rect x={0} y={0} width={1080} height={520} fill="#D9DEE6" />
      {[
        [60, 80, 260, 90],
        [420, 60, 260, 90],
        [760, 110, 260, 90],
        [120, 230, 240, 80],
        [520, 250, 240, 80],
        [860, 260, 200, 80],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke="#B8C0CC" strokeWidth={4} />
      ))}
      {/* Fenêtre */}
      <rect x={200} y={520} width={680} height={330} fill="#BFD9F2" stroke={INK} strokeWidth={6} />
      <line x1={540} y1={520} x2={540} y2={850} stroke={INK} strokeWidth={6} />
      <line x1={200} y1={685} x2={880} y2={685} stroke={INK} strokeWidth={6} />
      {/* Cloison rouge à droite */}
      <rect x={880} y={560} width={220} height={560} fill="#C7312B" />
      {/* Sol */}
      <rect x={0} y={1267} width={1080} height={653} fill="#2F4F80" />
      {/* Bureau et écran */}
      <rect x={60} y={1180} width={960} height={44} rx={6} fill="#DDE2EA" stroke={INK} strokeWidth={4} />
      <rect x={90} y={1224} width={20} height={200} fill="#9AA3B2" />
      <rect x={950} y={1224} width={20} height={200} fill="#9AA3B2" />
      <rect x={640} y={870} width={230} height={150} rx={8} fill="#1E2A3A" stroke={INK} strokeWidth={4} />
      <rect x={656} y={884} width={198} height={120} fill="#CFE3F7" />
      <rect x={700} y={1020} width={110} height={16} fill="#6B7585" />
    </g>
  );
}

function Couloir(): React.ReactElement {
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill="#EEF1F5" />
      {/* Plafond et néons */}
      <rect x={0} y={0} width={1080} height={640} fill="#D5DBE4" />
      {[140, 420, 700].map((x) => (
        <rect key={x} x={x} y={120} width={240} height={20} fill="#FFFFFF" stroke="#9AA3B2" strokeWidth={3} />
      ))}
      {/* Portes */}
      {[90, 700].map((x) => (
        <g key={x}>
          <rect x={x} y={760} width={290} height={520} fill="#7D8CA3" stroke={INK} strokeWidth={6} />
          <rect x={x + 20} y={780} width={250} height={480} fill="#6B7A92" />
          <circle cx={x + 250} cy={1040} r={8} fill="#F2C94C" />
        </g>
      ))}
      {/* Sol : lames de parquet */}
      <rect x={0} y={1267} width={1080} height={653} fill="#B9A58C" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={0} y1={1267 + i * 110} x2={1080} y2={1267 + i * 110} stroke="#9B8771" strokeWidth={4} />
      ))}
    </g>
  );
}

function SalleReunion(): React.ReactElement {
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill="#EDEFF3" />
      {/* Tableau blanc */}
      <rect x={160} y={260} width={760} height={460} fill="#FFFFFF" stroke="#8A93A3" strokeWidth={18} />
      <line x1={230} y1={370} x2={600} y2={370} stroke="#2F6DB5" strokeWidth={8} strokeLinecap="round" />
      <line x1={230} y1={430} x2={820} y2={430} stroke="#2F6DB5" strokeWidth={8} strokeLinecap="round" />
      <line x1={230} y1={490} x2={520} y2={490} stroke="#D62B2B" strokeWidth={8} strokeLinecap="round" />
      {/* Sol */}
      <rect x={0} y={1267} width={1080} height={653} fill="#8C97A8" />
      {/* Chaises du fond */}
      {[200, 450, 700].map((x) => (
        <rect key={x} x={x} y={1020} width={150} height={120} rx={12} fill="#4B5566" />
      ))}
      {/* Grande table */}
      <rect x={40} y={1150} width={1000} height={60} rx={10} fill="#8B6B4A" stroke={INK} strokeWidth={4} />
      <rect x={100} y={1210} width={24} height={200} fill="#6E5236" />
      <rect x={956} y={1210} width={24} height={200} fill="#6E5236" />
    </g>
  );
}

function Exterieur(): React.ReactElement {
  return (
    <g>
      <defs>
        <linearGradient id="ciel" x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0" stopColor="#7CC4F2" />
          <stop offset="1" stopColor="#E8F7FF" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1080} height={1920} fill="url(#ciel)" />
      <circle cx={860} cy={300} r={90} fill="#FFD95A" stroke="#E0A800" strokeWidth={6} />
      {/* Immeubles */}
      {[
        [0, 620, 220, 650, '#9AA7BC'],
        [200, 520, 260, 750, '#7F8EA6'],
        [440, 680, 200, 590, '#A9B6CA'],
        [620, 560, 240, 710, '#8593AA'],
        [840, 640, 240, 630, '#9AA7BC'],
      ].map(([x, y, w, h, c], i) => (
        <g key={i}>
          <rect x={x as number} y={y as number} width={w as number} height={h as number} fill={c as string} stroke={INK} strokeWidth={5} />
          {[0, 1, 2, 3].map((r) =>
            [0, 1].map((col) => (
              <rect
                key={`${r}-${col}`}
                x={(x as number) + 30 + col * 90}
                y={(y as number) + 40 + r * 110}
                width={50}
                height={60}
                fill="#DDEBFA"
                stroke={INK}
                strokeWidth={3}
              />
            )),
          )}
        </g>
      ))}
      {/* Trottoir et route */}
      <rect x={0} y={1267} width={1080} height={100} fill="#C9CDD4" />
      <rect x={0} y={1367} width={1080} height={553} fill="#5E636C" />
      <line x1={0} y1={1600} x2={1080} y2={1600} stroke="#F2F2F2" strokeWidth={10} strokeDasharray="60 40" />
    </g>
  );
}

const SETS_ART: Record<SetId, () => React.ReactElement> = {
  bureau: Bureau,
  couloir: Couloir,
  'salle-reunion': SalleReunion,
  exterieur: Exterieur,
};

/** Décor plein cadre, recadré pour remplir le format (vertical ou horizontal). */
export const CartoonSet: React.FC<{ set: SetId; style?: React.CSSProperties }> = ({ set, style }) => {
  const Art = SETS_ART[set] ?? Bureau;
  return (
    <svg
      viewBox="0 0 1080 1920"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
    >
      <Art />
    </svg>
  );
};
