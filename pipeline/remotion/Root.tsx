import React from 'react';
import { Composition } from 'remotion';
import { ViralTemplate } from '../../src/video-engine/ViralTemplate';
import type { ViralTemplateProps } from '../../src/video-engine/types';

const defaultProps: ViralTemplateProps = {
  hookText: 'tikvo',
  nicheName: 'tikvo',
  clips: [],
  karaokeWords: [],
  totalDurationInFrames: 150,
  hookFrames: 90,
};

export const Root: React.FC = () => (
  <Composition
    id="Viral"
    component={ViralTemplate}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={150}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(30, props.totalDurationInFrames),
      width: props.width ?? 1080,
      height: props.height ?? 1920,
    })}
  />
);
