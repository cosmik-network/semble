'use client';

import {
  Card,
  Group,
  Image,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useState } from 'react';
import { IoArrowForward } from 'react-icons/io5';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';
import type { UrlType, UrlView } from '@semble/types';
import { LinkAnchor, LinkNavLink } from '@/components/link/MantineLink';
import UrlTypeSelect from '@/features/search/components/urlTypeSelect/UrlTypeSelect';
import useSemanticSearchPreview from '@/features/search/lib/queries/useSemanticSearchPreview';
import { getDomain, getSembleHref } from '@/lib/utils/link';
import { renderUrlTypeIcon } from '@/lib/utils/icon';
import { useScrollFade } from '@/hooks/useScrollFade';

const MAX_HEIGHT = 360;

interface Props {
  query: string;
  // live input text, so a click before the debounce settles keeps the last word
  seeMoreQuery: string;
  urlType: UrlType | null;
  onUrlTypeChange: (urlType: UrlType | null) => void;
  onNavigate: () => void;
}

export default function SearchPreviewPanel(props: Props) {
  const { setViewport, maskImage, updateFade } = useScrollFade();

  const { data, isPending, isError, isPlaceholderData } =
    useSemanticSearchPreview({
      query: props.query,
      urlType: props.urlType ?? undefined,
    });
  const urls = data?.urls ?? [];

  const params = new URLSearchParams({ query: props.seeMoreQuery });
  if (props.urlType) params.set('urlType', props.urlType);

  const onSeeMore = () => {
    track('Search: header preview see more clicked');
    posthog.capture('Search: header preview see more clicked');
    props.onNavigate();
  };

  const onResultClick = () => {
    track('Search: header preview result clicked');
    posthog.capture('Search: header preview result clicked');
    props.onNavigate();
  };

  return (
    <Stack gap={0} pb={8}>
      <Group justify="space-between" wrap="nowrap" pl="md" pr="xs" pt="xs">
        <LinkAnchor
          href={`/search/cards?${params.toString()}`}
          onClick={onSeeMore}
          c="blue"
          fz="sm"
          fw={600}
        >
          <Group gap={4} wrap="nowrap">
            See more
            <IoArrowForward />
          </Group>
        </LinkAnchor>
        <UrlTypeSelect
          value={props.urlType}
          onChange={props.onUrlTypeChange}
          position="bottom-end"
          withinPortal={false}
        />
      </Group>

      <ScrollArea.Autosize
        mah={MAX_HEIGHT}
        type="scroll"
        viewportRef={setViewport}
        onScrollPositionChange={updateFade}
        styles={{
          viewport: maskImage
            ? { maskImage, WebkitMaskImage: maskImage }
            : undefined,
        }}
      >
        <Stack
          gap={6}
          px={8}
          style={{
            opacity: isPlaceholderData ? 0.5 : 1,
            transition: 'opacity 150ms ease',
          }}
        >
          {isPending ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Group key={i} gap="sm" wrap="nowrap" p="xs">
                <Skeleton height={40} width={40} radius="md" />
                <Stack gap={6} flex={1}>
                  <Skeleton height={12} width="70%" radius="xl" />
                  <Skeleton height={10} width="40%" radius="xl" />
                </Stack>
              </Group>
            ))
          ) : isError ? (
            <Text c="dimmed" ta="center" fz="sm" py="lg">
              Could not search
            </Text>
          ) : urls.length === 0 ? (
            <Text c="dimmed" ta="center" fz="sm" py="lg">
              No cards found
            </Text>
          ) : (
            urls.map((urlView) => (
              <PreviewRow
                key={urlView.url}
                urlView={urlView}
                onClick={onResultClick}
              />
            ))
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}

function PreviewRow(props: { urlView: UrlView; onClick: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const metadata = props.urlView.metadata;
  const domain = getDomain(props.urlView.url);

  return (
    <LinkNavLink
      href={getSembleHref(props.urlView.url, { ref: 'search' })}
      onClick={props.onClick}
      px={8}
      py={4}
      styles={{ section: { marginInlineEnd: 8 } }}
      leftSection={
        metadata.imageUrl && !imageFailed ? (
          <Card p={0} radius="md" withBorder w={40} h={40}>
            <Image
              src={metadata.imageUrl}
              alt=""
              w="100%"
              h="100%"
              fit="cover"
              onError={() => setImageFailed(true)}
            />
          </Card>
        ) : (
          <ThemeIcon variant="light" color="gray" size={40} radius="md">
            {renderUrlTypeIcon(metadata.type as UrlType | undefined, {
              size: 18,
            })}
          </ThemeIcon>
        )
      }
      label={
        <Text span fw={500} c="bright" lineClamp={1}>
          {metadata.title || domain}
        </Text>
      }
      description={
        <Text span fz="sm" c="gray" lineClamp={1}>
          {domain}
        </Text>
      }
    />
  );
}
