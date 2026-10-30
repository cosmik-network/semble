'use client';

import {
  Avatar,
  Box,
  Card,
  Center,
  Group,
  Image,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { FaPlay } from 'react-icons/fa6';
import { IoMdInformationCircle } from 'react-icons/io';
import type { UrlMetadata } from '@semble/types';
import BlueskyPlatformIcon from '@/features/platforms/bluesky/components/blueskyPlatformIcon/BlueskyPlatformIcon';
import { detectUrlPlatform, getDomain } from '@/lib/utils/link';
import {
  ARTWORK_SIZE,
  AVATAR_SIZE,
  EMBEDDED_LINK_THUMB,
  POST_LINES,
  PREVIEW_MARGIN,
  WIDE_IMAGE_HEIGHT,
  type LinkCardPreview,
  type PostMedia,
  type PostQuote,
} from '../../model/linkCards';

interface Props {
  metadata: UrlMetadata;
  preview: Exclude<LinkCardPreview, { kind: 'plain' }>;
  mediaRevealed: boolean;
}

function Still(props: { url: string; alt: string; h: number; w?: number }) {
  return (
    <Card
      p={0}
      radius="md"
      withBorder
      h={props.h}
      w={props.w}
      style={{ flexShrink: 0 }}
    >
      <Image
        loading="lazy"
        decoding="async"
        src={props.url}
        alt={props.alt}
        h="100%"
        w="100%"
        fit="cover"
      />
    </Card>
  );
}

function PlayBadge() {
  return (
    <Center pos="absolute" inset={0}>
      <ThemeIcon size={44} radius="xl" color="dark" opacity={0.8}>
        <FaPlay size={16} />
      </ThemeIcon>
    </Center>
  );
}

// The grids of the webapp's ImageEmbed, at the height the layout gave them
const GRID_COLUMNS = ['1fr', '1fr 1fr', '2fr 1fr', '1fr 1fr'];

function EmbeddedLink(props: { media: Extract<PostMedia, { kind: 'link' }> }) {
  return (
    <Card p="xs" withBorder h={props.media.height}>
      <Group gap="xs" wrap="nowrap">
        {props.media.thumbUrl && (
          <Image
            loading="lazy"
            decoding="async"
            src={props.media.thumbUrl}
            alt=""
            h={EMBEDDED_LINK_THUMB}
            w={EMBEDDED_LINK_THUMB}
            radius="sm"
            style={{ flexShrink: 0 }}
          />
        )}
        <Stack gap={0} miw={0}>
          <Text fz="sm" fw={500} c="bright" lineClamp={1}>
            {props.media.title}
          </Text>
          <Text fz="sm" fw={500} c="gray" lineClamp={1}>
            {getDomain(props.media.url)}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}

// ContentHider's notice, in the media's place so showing it keeps the card's
// size. The selection popup shows it.
function HiddenMedia(props: { height: number; reason: string }) {
  return (
    <Center h={props.height} bdrs="md" bg="var(--mantine-color-default-hover)">
      <Group gap="xs" c="gray">
        <IoMdInformationCircle size={18} />
        <Text fw={600} fz="sm">
          {props.reason}
        </Text>
      </Group>
    </Center>
  );
}

function Media(props: { media: PostMedia }) {
  if (props.media.kind === 'link') return <EmbeddedLink media={props.media} />;
  const count = props.media.images.length;
  // A single still letterboxes, as in the webapp; grids crop
  const fit = count === 1 ? 'contain' : 'cover';
  return (
    <Box pos="relative">
      <Box
        h={props.media.height}
        bdrs="md"
        style={{
          display: 'grid',
          gap: 'var(--mantine-spacing-xxs)',
          gridTemplateColumns: GRID_COLUMNS[count - 1],
          gridTemplateRows: count > 2 ? '1fr 1fr' : '1fr',
          overflow: 'hidden',
        }}
      >
        {props.media.images.map((image, i) => (
          <Box
            key={i}
            pos="relative"
            miw={0}
            mih={0}
            bg="var(--mantine-color-default-hover)"
            style={count === 3 && i === 0 ? { gridRow: 'span 2' } : undefined}
          >
            <Image
              loading="lazy"
              decoding="async"
              src={image.url}
              alt={image.alt}
              pos="absolute"
              inset={0}
              w="100%"
              h="100%"
              fit={fit}
            />
          </Box>
        ))}
      </Box>
      {props.media.kind === 'video' && <PlayBadge />}
    </Box>
  );
}

function PostAuthor(props: { author: PostQuote['author'] }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar
        src={props.author.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
        alt={`${props.author.name} avatar`}
        size={AVATAR_SIZE}
        radius="xl"
      />
      <Text c="bright" lineClamp={1} fw={500}>
        {props.author.name}
      </Text>
    </Group>
  );
}

function Quote(props: { quote: PostQuote }) {
  return (
    <Card p="sm" withBorder>
      <Stack gap={PREVIEW_MARGIN}>
        <PostAuthor author={props.quote.author} />
        {props.quote.text && <Text lineClamp={1}>{props.quote.text}</Text>}
      </Stack>
    </Card>
  );
}

function Title(props: { metadata: UrlMetadata }) {
  if (!props.metadata.title) return null;
  return (
    <Text c="bright" lineClamp={2} fw={500}>
      {props.metadata.title}
    </Text>
  );
}

export default function LinkCardPreviewContent(props: Props) {
  const metadata = props.metadata;
  const preview = props.preview;
  const domain = (
    <Text c="gray" fz="sm" lineClamp={1}>
      {getDomain(metadata.url)}
    </Text>
  );

  if (preview.kind === 'video') {
    return (
      <Stack gap={0}>
        <Box pos="relative" mb={PREVIEW_MARGIN}>
          <Still
            url={preview.imageUrl}
            alt={`${metadata.url} thumbnail`}
            h={WIDE_IMAGE_HEIGHT}
          />
          <PlayBadge />
        </Box>
        {domain}
        <Title metadata={metadata} />
      </Stack>
    );
  }

  if (preview.kind === 'audio') {
    return (
      <Group justify="space-between" align="start" gap="lg" wrap="nowrap">
        <Stack gap={0} flex={1}>
          <Text c="gray" fz="sm" fw={600} lineClamp={1}>
            {preview.label}
          </Text>
          <Title metadata={metadata} />
          {domain}
        </Stack>
        <Still
          url={preview.imageUrl}
          alt={`${metadata.url} artwork`}
          h={ARTWORK_SIZE}
          w={ARTWORK_SIZE}
        />
      </Group>
    );
  }

  return (
    <Stack gap={PREVIEW_MARGIN}>
      <Group justify="space-between" wrap="nowrap" h={AVATAR_SIZE}>
        <PostAuthor author={preview.author} />
        <BlueskyPlatformIcon platform={detectUrlPlatform(metadata.url).type} />
      </Group>
      {preview.text && (
        <Text
          lineClamp={POST_LINES}
          style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
        >
          {preview.text}
        </Text>
      )}
      {preview.media &&
        (preview.mediaHiddenBecause && !props.mediaRevealed ? (
          <HiddenMedia
            height={preview.media.height}
            reason={preview.mediaHiddenBecause}
          />
        ) : (
          <Media media={preview.media} />
        ))}
      {preview.quote && <Quote quote={preview.quote} />}
    </Stack>
  );
}
