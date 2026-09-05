'use client';

import { AppBskyEmbedVideo } from '@atproto/api';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface Props {
  embed: AppBskyEmbedVideo.View;
}

export default function VideoPlayer(props: Props) {
  return (
    <MediaPlayer
      crossOrigin
      playsInline
      autoPlay
      viewType="video"
      src={props.embed.playlist}
      poster={props.embed.thumbnail ?? ''}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
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
  );
}
