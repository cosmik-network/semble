'use client';

import {
  ActionIcon,
  AspectRatio,
  Box,
  Card,
  Combobox,
  Group,
  Image,
  Kbd,
  Skeleton,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useDebouncedValue, useInterval } from '@mantine/hooks';
import { IoSearch } from 'react-icons/io5';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';
import { semanticSearchUrls } from '@/features/search/lib/dal';
import { searchKeys } from '@/features/search/lib/searchKeys';
import ThumbnailPreviewCard, {
  THUMBNAIL_CARD_WIDTH,
} from '@/components/contentDisplay/thumbnailPreviewCard/ThumbnailPreviewCard';
import PlaceholderImage from '@/assets/placeholder-image.png';

const SUBJECTS = [
  'AI for science',
  'Data cooperatives',
  'Hypertext',
  'open source AI',
];

// Full-opacity cards; one extra ("peek") card is fetched beyond this and
// shown dimmed to hint there are more results than previewed here.
const PREVIEW_LIMIT = 3;
const PEEK_LIMIT = PREVIEW_LIMIT + 1;
const MIN_QUERY_LENGTH = 2;
const CARD_GAP = 8;
const DROPDOWN_PADDING = 24;
// Matches Combobox.Option's own padding — applied via CardSlot to the
// skeleton too, so loading and loaded cards are never different sizes.
const CARD_SLOT_PADDING = 4;
// Fits a 1-line domain + 2-line title, so cards don't resize once shorter
// real text replaces the skeleton.
const CARD_TEXT_HEIGHT = 54;
const DROPDOWN_WIDTH =
  THUMBNAIL_CARD_WIDTH * PEEK_LIMIT +
  CARD_GAP * (PEEK_LIMIT - 1) +
  DROPDOWN_PADDING;

// Left-to-right fade instead of flat opacity, so the peek card trails off
// toward the dropdown's edge rather than looking uniformly faded.
const DIMMED_MASK =
  'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 100%)';

function openInNewTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function CardSlot(props: {
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      w={THUMBNAIL_CARD_WIDTH}
      miw={THUMBNAIL_CARD_WIDTH}
      p={CARD_SLOT_PADDING}
      style={
        props.dimmed
          ? { maskImage: DIMMED_MASK, WebkitMaskImage: DIMMED_MASK }
          : undefined
      }
    >
      {props.children}
    </Box>
  );
}

const placeholderFallback = (
  <Card p={0} radius="md" withBorder>
    <Image
      src={PlaceholderImage.src}
      alt="No thumbnail available"
      w="100%"
      h="100%"
      fit="cover"
    />
  </Card>
);

export default function HeaderSearchBar() {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [debounced] = useDebouncedValue(search, 250);
  const trimmed = debounced.trim();

  const { data, isLoading } = useQuery({
    queryKey: searchKeys.headerPreview(trimmed, PEEK_LIMIT),
    queryFn: () => semanticSearchUrls(trimmed, { limit: PEEK_LIMIT }),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
  const results = data?.urls ?? [];

  const [subjectIndex, setSubjectIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useInterval(
    () => {
      // fade the current subject out, swap it while hidden, then fade back in
      clearTimeout(fadeTimeout.current);
      setPlaceholderVisible(false);
      fadeTimeout.current = setTimeout(() => {
        setSubjectIndex((index) => (index + 1) % SUBJECTS.length);
        setPlaceholderVisible(true);
      }, 150);
    },
    2500,
    { autoInvoke: true },
  );

  const handleExplore = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    track('Search: header search button clicked');
    posthog.capture('Search: header search button clicked');
    openInNewTab(
      `/search/cards?${new URLSearchParams({ query: trimmedQuery }).toString()}`,
    );
  };

  const showDropdown = isFocused && trimmed.length >= MIN_QUERY_LENGTH;

  return (
    <Combobox
      shadow="sm"
      radius="md"
      width={DROPDOWN_WIDTH}
      store={combobox}
      position="bottom-start"
      // crossAxis compensates for the target (bare input) sitting ~10px
      // inside the search bar Card's own left edge (its `pl="xs"`).
      offset={{ mainAxis: 8, crossAxis: -10 }}
      onOptionSubmit={(value) => {
        openInNewTab(value);
        combobox.closeDropdown();
      }}
    >
      <Card pr="4" py="2" pl="xs" radius="lg" w="100%" withBorder>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExplore(search);
          }}
        >
          <Group gap="xs" justify="space-between" wrap="nowrap" w="100%">
            <Box pos="relative" flex={1}>
              <Combobox.Target>
                <TextInput
                  variant="unstyled"
                  flex={1}
                  size="md"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    combobox.openDropdown();
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    combobox.openDropdown();
                  }}
                  onBlur={() => setIsFocused(false)}
                />
              </Combobox.Target>
              {!search && (
                <Text
                  pos="absolute"
                  inset={0}
                  fz="md"
                  fw={600}
                  c="dimmed"
                  lineClamp={1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  Try&nbsp;
                  <Text
                    span
                    inherit
                    c="bright"
                    style={{
                      opacity: placeholderVisible ? 1 : 0,
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    &quot;{SUBJECTS[subjectIndex]}&quot;
                  </Text>
                </Text>
              )}
            </Box>
            {showDropdown && (
              <Group
                gap={4}
                wrap="nowrap"
                style={{ flexShrink: 0, cursor: 'pointer' }}
                // Prevents the mousedown from blurring (and hiding) this
                // before its own click handler can fire.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  handleExplore(search);
                  combobox.closeDropdown();
                }}
              >
                <Kbd size="xs">↵</Kbd>
                <Text fz={11} c="dimmed" fw={500} visibleFrom="sm">
                  see all
                </Text>
              </Group>
            )}
            <ActionIcon
              type="submit"
              size="lg"
              radius="xl"
              disabled={!search.trim()}
            >
              <IoSearch size={20} />
            </ActionIcon>
          </Group>
        </form>
      </Card>

      <Combobox.Dropdown hidden={!showDropdown}>
        <Combobox.Options>
          <Group gap="xs" wrap="nowrap" align="start" p={5}>
            {isLoading
              ? Array.from({ length: PEEK_LIMIT }).map((_, i) => (
                  <CardSlot key={i} dimmed={i >= PREVIEW_LIMIT}>
                    <AspectRatio ratio={16 / 9}>
                      <Skeleton radius="md" />
                    </AspectRatio>
                    <Stack gap={4} mt={6} mih={CARD_TEXT_HEIGHT}>
                      <Skeleton height={10} width="50%" radius="xl" />
                      <Skeleton height={10} width="85%" radius="xl" />
                    </Stack>
                  </CardSlot>
                ))
              : results.map((result, i) => (
                  <Combobox.Option
                    key={result.url}
                    value={result.url}
                    p={0}
                    style={{ flex: 'none' }}
                  >
                    <CardSlot dimmed={i >= PREVIEW_LIMIT}>
                      <ThumbnailPreviewCard
                        imageUrl={result.metadata.imageUrl}
                        title={result.metadata.title || result.url}
                        url={result.url}
                        textHeight={CARD_TEXT_HEIGHT}
                        fallback={placeholderFallback}
                      />
                    </CardSlot>
                  </Combobox.Option>
                ))}
          </Group>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
