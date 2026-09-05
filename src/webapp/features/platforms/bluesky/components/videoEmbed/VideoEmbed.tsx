'use client';

import { AppBskyEmbedVideo } from '@atproto/api';
import { Box } from '@mantine/core';
import { useState } from 'react';
import VideoPoster from './VideoPoster';
import VideoPlayer from './VideoPlayer';
import classes from './VideoEmbed.module.css';

interface Props {
  embed: AppBskyEmbedVideo.View;
}

export default function VideoEmbed(props: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const ratio = props.embed.aspectRatio
    ? props.embed.aspectRatio.width / props.embed.aspectRatio.height
    : 16 / 9;

  return (
    <Box className={classes.frame} w="100%">
      <Box className={classes.video} style={{ '--video-ratio': ratio }}>
        {isPlaying ? (
          <VideoPlayer embed={props.embed} />
        ) : (
          <VideoPoster
            thumbnail={props.embed.thumbnail}
            onPlay={() => setIsPlaying(true)}
          />
        )}
      </Box>
    </Box>
  );
}
