import React from 'react';
import { Player } from '@remotion/player';
import { ViralTemplate } from './ViralTemplate';
import type { ViralTemplateProps } from './types.ts';

interface RemotionViralPlayerProps {
  templateProps: ViralTemplateProps;
  autoPlay?: boolean;
  loop?: boolean;
}

export const RemotionViralPlayer: React.FC<RemotionViralPlayerProps> = ({
  templateProps,
  autoPlay = true,
  loop = true,
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
      <Player
        component={ViralTemplate}
        inputProps={templateProps}
        durationInFrames={Math.max(30, templateProps.totalDurationInFrames)}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        style={{ width: '100%', height: '100%', maxHeight: '100%' }}
        controls
        autoPlay={autoPlay}
        loop={loop}
        acknowledgeRemotionLicense
      />
    </div>
  );
};
