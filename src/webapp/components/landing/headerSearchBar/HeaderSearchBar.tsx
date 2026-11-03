'use client';

import {
  ActionIcon,
  Box,
  Card,
  Group,
  Popover,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue, useInterval } from '@mantine/hooks';
import { IoSearch } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';
import type { UrlType } from '@semble/types';
import SearchPreviewPanel from '../searchPreviewPanel/SearchPreviewPanel';
import { MIN_PREVIEW_QUERY_LENGTH } from '@/features/search/lib/queries/useSemanticSearchPreview';

const SUBJECTS = [
  'AI for science',
  'Data cooperatives',
  'Hypertext',
  'open source AI',
];

export default function HeaderSearchBar() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [previewOpened, setPreviewOpened] = useState(false);
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);
  const [previewUrlType, setPreviewUrlType] = useState<UrlType | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useInterval(
    () => {
      // fade the current subject out, swap it while hidden, then fade back in
      clearTimeout(fadeTimeout.current);
      setVisible(false);
      fadeTimeout.current = setTimeout(() => {
        setSubjectIndex((index) => (index + 1) % SUBJECTS.length);
        setVisible(true);
      }, 150);
    },
    2500,
    { autoInvoke: true },
  );

  const onSearch = () => {
    const params = new URLSearchParams();
    params.set('query', search);
    setPreviewOpened(false);

    startTransition(() => router.push(`/search/cards?${params.toString()}`));
  };

  return (
    <Popover
      opened={
        previewOpened && debouncedSearch.length >= MIN_PREVIEW_QUERY_LENGTH
      }
      onChange={setPreviewOpened}
      position="bottom"
      width="min(480px, calc(100vw - 32px))"
      withinPortal={false}
      offset={8}
      radius="lg"
      shadow="md"
    >
      <Popover.Target>
        <Card pr="4" py="2" pl="xs" radius="lg" w="100%" withBorder>
          <form
            data-analytics-form="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search) onSearch();
            }}
          >
            <Group gap="xs" justify="space-between" wrap="nowrap" w="100%">
              <Box pos="relative" flex={1}>
                <TextInput
                  variant="unstyled"
                  flex={1}
                  size="md"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    setPreviewOpened(true);
                  }}
                  onFocus={() => setPreviewOpened(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setPreviewOpened(false);
                  }}
                />
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
                        opacity: visible ? 1 : 0,
                        transition: 'opacity 150ms ease',
                      }}
                    >
                      &quot;{SUBJECTS[subjectIndex]}&quot;
                    </Text>
                  </Text>
                )}
              </Box>
              <ActionIcon
                type="submit"
                size="lg"
                radius="xl"
                disabled={!search}
                loading={isPending}
                onClick={() => {
                  track('Search: header search button clicked');
                  posthog.capture('Search: header search button clicked');
                }}
              >
                <IoSearch size={20} />
              </ActionIcon>
            </Group>
          </form>
        </Card>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <SearchPreviewPanel
          query={debouncedSearch}
          seeMoreQuery={search.trim()}
          urlType={previewUrlType}
          onUrlTypeChange={setPreviewUrlType}
          onNavigate={() => setPreviewOpened(false)}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
