'use client';

import { AppBskyEmbedVideo } from '@atproto/api';
import { AspectRatio } from '@mantine/core';
import {
  MediaPlayer,
  MediaProvider,
  MuteButton,
  MuteButtonInstance,
  PlayButton,
  VolumeSlider,
  VolumeSliderInstance,
} from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface Props {
  embed: AppBskyEmbedVideo.View;
}

export default function VideoEmbed(props: Props) {
  const ratio = props.embed.aspectRatio
    ? props.embed.aspectRatio.width / props.embed.aspectRatio.height
    : 16 / 9;

  return (
    <AspectRatio ratio={ratio}>
      <MediaPlayer
        crossOrigin
        playsInline
        viewType="video"
        src={props.embed.playlist}
        poster={props.embed.thumbnail ?? ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          '--video-border': '0px',
        }}
      >
        <MediaProvider />
        <DefaultVideoLayout
          thumbnails={props.embed.thumbnail}
          icons={defaultLayoutIcons}
          slots={{
            settingsMenu: null,
            captionButton: null,
            airPlayButton: null,
            googleCastButton: null,
          }}
        />
      </MediaPlayer>
    </AspectRatio>
  );
}
