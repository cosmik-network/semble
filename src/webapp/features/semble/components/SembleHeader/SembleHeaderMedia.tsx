'use client';

import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { Card, AspectRatio } from '@mantine/core';
import { ReactNode } from 'react';

interface Props {
  url: string;
  children: ReactNode;
}

function getEmbedConfig(platform: ReturnType<typeof detectUrlPlatform>): {
  url: string;
  height?: number;
  aspectRatio?: number;
  radius: string | number;
} | null {
  switch (platform.type) {
    case SupportedPlatform.YOUTUBE_VIDEO:
      return {
        url: platform.url,
        aspectRatio: 16 / 9,
        radius: 'md',
      };
    case SupportedPlatform.SPOTIFY:
      return {
        url: platform.url,
        height: 152,
        radius: 'lg',
      };
    case SupportedPlatform.SOUNDCLOUD_TRACK:
      return {
        url: platform.url,
        height: 166,
        radius: 'xs',
      };
    case SupportedPlatform.SOUNDCLOUD_SET:
      return {
        url: platform.url,
        height: 280,
        radius: 'xs',
      };
    case SupportedPlatform.PLYRFM_TRACK:
      return {
        url: platform.url,
        height: 200,
        radius: 'md',
      };
    case SupportedPlatform.BANDCAMP_ALBUM:
    case SupportedPlatform.BANDCAMP_TRACK:
      return {
        url: platform.url,
        height: 120,
        radius: 0,
      };
    default:
      return null;
  }
}

export default function SembleHeaderMedia({ url, children }: Props) {
  const platform = detectUrlPlatform(url);
  const embedConfig = getEmbedConfig(platform);

  if (!embedConfig) {
    return <>{children}</>;
  }

  const iframe = (
    <iframe
      src={embedConfig.url}
      width="100%"
      height={embedConfig.aspectRatio ? '100%' : embedConfig.height}
      allowFullScreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      style={{ border: 0, display: 'block' }}
    />
  );

  return (
    <Card p={0} radius={embedConfig.radius} w={350} maw="100%">
      {embedConfig.aspectRatio ? (
        <AspectRatio ratio={embedConfig.aspectRatio}>{iframe}</AspectRatio>
      ) : (
        iframe
      )}
    </Card>
  );
}
