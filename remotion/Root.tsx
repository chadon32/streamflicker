import React from 'react';
import {Composition} from 'remotion';
import {StreamFlickerAd} from './StreamFlickerAd';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StreamFlickerAd"
      component={StreamFlickerAd}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
