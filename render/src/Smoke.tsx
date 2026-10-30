import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111',
        color: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 96,
        fontFamily: 'sans-serif',
      }}
    >
      tikvo smoke {frame}
    </AbsoluteFill>
  );
};
