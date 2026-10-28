import React, { useRef } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { ViralTemplate } from './ViralTemplate';
import { ViralTemplateProps } from './types';

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
  const playerRef = useRef<PlayerRef>(null);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
      <Player
        ref={playerRef}
        component={ViralTemplate}
        inputProps={templateProps}
        durationInFrames={templateProps.totalDurationInFrames || 900}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        controls={true}
        autoPlay={autoPlay}
        loop={loop}
      />
    </div>
  );
};
