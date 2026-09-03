'use client';

import { AppBskyEmbedVideo } from '@atproto/api';
import { AspectRatio, Card, Image } from '@mantine/core';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });

interface Props {
  embed: AppBskyEmbedVideo.View;
}

export default function VideoEmbed(props: Props) {
  const ratio = props.embed.aspectRatio
    ? props.embed.aspectRatio.width / props.embed.aspectRatio.height
    : 16 / 9;

  return (
    <AspectRatio ratio={ratio} style={{ position: 'relative', zIndex: 0 }}>
      {props.embed.thumbnail ? (
        <Image
          src={props.embed.thumbnail}
          alt=""
          fit="cover"
          radius="md"
          style={{ maxHeight: '200px' }}
        />
      ) : (
        <Card
          p={0}
          radius="md"
          bg="var(--mantine-color-disabled)"
          style={{ maxHeight: '200px' }}
        />
      )}
      <VideoPlayer embed={props.embed} />
    </AspectRatio>
  );
}
