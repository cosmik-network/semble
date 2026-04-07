'use client';

import {
  Card,
  Combobox,
  Group,
  Image,
  Input,
  Loader,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  useCombobox,
  VisuallyHidden,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchUrls } from '../../lib/dal';
import { BiPlus } from 'react-icons/bi';
import { getDomain } from '@/lib/utils/link';
import useMyCards from '@/features/cards/lib/queries/useMyCards';
import type { UrlMetadata } from '@semble/types';
import SourceCardPreview from './SourceCardPreview';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function useUrlSearch(debounced: string) {
  return useQuery({
    queryKey: ['url search', debounced],
    queryFn: () =>
      searchUrls({
        searchQuery: debounced,
        limit: 10,
      }),
    enabled: debounced.trim().length > 0,
  });
}

export function UrlSearchInputSkeleton() {
  return (
    <Card padding="xs" radius="lg" withBorder>
      <Skeleton height={30} radius="sm" />
    </Card>
  );
}

interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: React.ReactNode;
  onUrlSelect: (url: string) => void;
  onUrlClear?: () => void;
}

export default function UrlSearchInput(props: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [inputValue, setInputValue] = useState(props.value);
  const [confirmedUrl, setConfirmedUrl] = useState<string | null>(
    isValidUrl(props.value) ? props.value : null,
  );
  const [confirmedMetadata, setConfirmedMetadata] = useState<
    UrlMetadata | undefined
  >(undefined);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [debounced] = useDebouncedValue(inputValue, 200);

  const { data: searchResults, isFetching, error } = useUrlSearch(debounced);
  const { data: recentCards } = useMyCards({ limit: 5 });

  const urls = searchResults?.urls ?? [];

  // Sync when the external value changes (e.g. after swap)
  const [prevValue, setPrevValue] = useState(props.value);
  if (props.value !== prevValue) {
    setInputValue(props.value);
    setPrevValue(props.value);
    if (isValidUrl(props.value)) {
      setConfirmedUrl(props.value);
    } else {
      setConfirmedUrl(null);
    }
    setConfirmedMetadata(undefined);
  }

  const handleClear = () => {
    setConfirmedUrl(null);
    setConfirmedMetadata(undefined);
    setInputValue('');
    props.onUrlSelect('');
    props.onUrlClear?.();
  };

  if (confirmedUrl) {
    return (
      <>
        <SourceCardPreview
          sourceUrl={confirmedUrl}
          metadata={confirmedMetadata}
          onRemove={handleClear}
        />
        <VisuallyHidden>
          <Input.Label htmlFor={props.id} required>
            {props.label}
          </Input.Label>
        </VisuallyHidden>
      </>
    );
  }

  const options = urls.map((urlView) => (
    <Combobox.Option key={urlView.url} value={urlView.url} p={5}>
      <Group gap={'xs'} align="center" wrap="nowrap">
        {urlView.metadata.imageUrl && (
          <Image
            src={urlView.metadata.imageUrl}
            alt={urlView.metadata.title || 'URL thumbnail'}
            w={35}
            h={35}
            radius="sm"
            fit="cover"
          />
        )}
        <Stack gap={0}>
          <Text fw={500} c={'bright'} lineClamp={1} size="sm">
            {urlView.metadata.title || urlView.url}
          </Text>
          <Text c={'gray'} lineClamp={1} size="xs">
            {getDomain(urlView.url)}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  ));

  return (
    <Card padding="xs" radius="lg" withBorder>
      <Stack gap={0}>
        <Combobox
          shadow="sm"
          radius={'md'}
          store={combobox}
          position="bottom-start"
          onOptionSubmit={(url) => {
            props.onUrlSelect(url);
            setInputValue(url);
            if (isValidUrl(url)) {
              setConfirmedUrl(url);
              // Look up metadata from search results or recent cards
              const searchMatch = urls.find((u) => u.url === url);
              const recentMatch = recentCards?.pages[0]?.cards?.find(
                (c) => c.url === url,
              );
              setConfirmedMetadata(
                searchMatch?.metadata ?? recentMatch?.cardContent,
              );
            }
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <Input
              id={props.id}
              component="input"
              type="text"
              placeholder={props.placeholder}
              value={inputValue}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setInputValue(val);
                combobox.openDropdown();
              }}
              onFocus={() => {
                setIsInputFocused(true);
                combobox.openDropdown();
              }}
              onBlur={() => {
                setIsInputFocused(false);
                combobox.closeDropdown();
              }}
              rightSection={isFetching && <Loader size={18} />}
              variant="unstyled"
              size="md"
              required
              error={props.error}
            />
          </Combobox.Target>

          <Combobox.Dropdown
            hidden={
              isFetching ||
              (inputValue.trim().length === 0 &&
                debounced.trim().length === 0 &&
                !(
                  isInputFocused && (recentCards.pages[0].cards.length ?? 0) > 0
                )) ||
              (inputValue.trim().length === 0 && debounced.trim().length > 0)
            }
          >
            <Combobox.Options>
              <ScrollArea.Autosize
                type="scroll"
                mah={{ base: 150, xs: 300 }}
                offsetScrollbars={'present'}
              >
                {debounced.trim().length === 0 ? (
                  <Fragment>
                    <Text size="sm" fw={500} c="dimmed" py="xs" px={5}>
                      Recent cards
                    </Text>
                    {(recentCards.pages[0].cards ?? []).map((card) => (
                      <Combobox.Option key={card.url} value={card.url} p={5}>
                        <Group gap={'xs'} align="center" wrap="nowrap">
                          {card.cardContent.imageUrl && (
                            <Image
                              src={card.cardContent.imageUrl}
                              alt={card.cardContent.title || 'URL thumbnail'}
                              w={35}
                              h={35}
                              radius="sm"
                              fit="cover"
                            />
                          )}
                          <Stack gap={0}>
                            <Text fw={500} c={'bright'} lineClamp={1} size="sm">
                              {card.cardContent.title || card.url}
                            </Text>
                            <Text c={'gray'} lineClamp={1} size="xs">
                              {getDomain(card.url)}
                            </Text>
                          </Stack>
                        </Group>
                      </Combobox.Option>
                    ))}
                  </Fragment>
                ) : (
                  <Fragment>
                    {error && (
                      <Combobox.Empty>Could not search for URLs</Combobox.Empty>
                    )}
                    {!isFetching && !error && inputValue.trim() && (
                      <Fragment>
                        <Combobox.Option value={inputValue}>
                          <Group gap="xs" wrap="nowrap" p={0}>
                            <ThemeIcon
                              radius={'xl'}
                              size={'sm'}
                              variant="light"
                              color="gray"
                            >
                              <BiPlus />
                            </ThemeIcon>
                            <Stack gap={0} style={{ flex: 1 }}>
                              <Text size="sm" fw={600} c={'bright'}>
                                Add this link
                              </Text>
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {inputValue}
                              </Text>
                            </Stack>
                          </Group>
                        </Combobox.Option>
                        {options.length > 0 && (
                          <Text size="sm" fw={500} c="dimmed" py="xs" px={5}>
                            Search results
                          </Text>
                        )}
                      </Fragment>
                    )}
                    {options.length > 0 && <Fragment>{options}</Fragment>}
                  </Fragment>
                )}
              </ScrollArea.Autosize>
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <VisuallyHidden>
          <Input.Label htmlFor={props.id} required>
            {props.label}
          </Input.Label>
        </VisuallyHidden>
      </Stack>
    </Card>
  );
}
