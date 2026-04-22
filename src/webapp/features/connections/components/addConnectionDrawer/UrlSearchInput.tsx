'use client';

import {
  Avatar,
  Card,
  Combobox,
  Group,
  Image,
  Input,
  Loader,
  ScrollArea,
  SegmentedControl,
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
import { useMyCardsInfinite } from '@/features/cards/lib/queries/useMyCards';
import { CollectionAccessType, type UrlMetadata } from '@semble/types';
import SourceCardPreview from './SourceCardPreview';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import { getRecordKey } from '@/lib/utils/atproto';

type SearchFilter = 'cards' | 'collections';

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

interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: React.ReactNode;
  onUrlSelect: (url: string) => void;
  onUrlClear?: () => void;
  onInputChange?: (rawValue: string) => void;
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
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('cards');

  const {
    data: searchResults,
    isFetching,
    error,
  } = useUrlSearch(searchFilter === 'cards' ? debounced : '');
  const { data: recentCards, isLoading: isLoadingRecentCards } =
    useMyCardsInfinite({ limit: 5 });

  const collectionSearch = useSearchCollections({
    searchText: searchFilter === 'collections' ? debounced : '',
    limit: 5,
    enabled: searchFilter === 'collections' && debounced.trim().length > 0,
  });

  const recentCardsList = recentCards?.pages[0]?.cards ?? [];

  const urls = searchResults?.urls ?? [];
  const collections =
    collectionSearch.data?.pages.flatMap((page) => page.collections ?? []) ??
    [];
  const isCollectionSearchFetching = collectionSearch.isFetching;
  const collectionSearchError = collectionSearch.error;

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

  const buildCollectionUrl = (collection: {
    uri?: string;
    author: { handle: string };
  }): string | null => {
    if (!collection.uri) return null;
    const rkey = getRecordKey(collection.uri);
    if (!rkey) return null;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${appUrl}/profile/${collection.author.handle}/collections/${rkey}`;
  };

  if (confirmedUrl) {
    return (
      <Fragment>
        <SourceCardPreview sourceUrl={confirmedUrl} onRemove={handleClear} />
        <VisuallyHidden>
          <Input.Label htmlFor={props.id} required>
            {props.label}
          </Input.Label>
        </VisuallyHidden>
      </Fragment>
    );
  }

  const isSearchFetching =
    searchFilter === 'cards' ? isFetching : isCollectionSearchFetching;

  const cardOptions = urls.map((urlView) => (
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

  const collectionOptions = collections.map((collection) => {
    const collectionUrl = buildCollectionUrl(collection);

    if (!collectionUrl) return null;

    return (
      <Combobox.Option key={collection.id} value={collectionUrl} p={5}>
        <Group gap={'xs'} align="center" justify="space-between" wrap="nowrap">
          <Text
            fw={500}
            c={
              collection.accessType === CollectionAccessType.OPEN
                ? 'green'
                : 'bright'
            }
            lineClamp={1}
            size="sm"
          >
            {collection.name}
          </Text>

          <Avatar
            src={collection.author?.avatarUrl?.replace(
              'avatar',
              'avatar_thumbnail',
            )}
            alt={`${collection.author?.handle}'s avatar`}
            size={'sm'}
          />
        </Group>
      </Combobox.Option>
    );
  });

  const hasSearchResults =
    searchFilter === 'cards'
      ? cardOptions.length > 0
      : collectionOptions.filter(Boolean).length > 0;

  const currentError = searchFilter === 'cards' ? error : collectionSearchError;

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
              const recentMatch = recentCardsList.find((c) => c.url === url);
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
              py={2.5}
              placeholder={props.placeholder}
              value={inputValue}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setInputValue(val);
                props.onInputChange?.(val);
                combobox.openDropdown();
              }}
              onFocus={() => {
                setIsInputFocused(true);
                combobox.openDropdown();
              }}
              onBlur={() => {
                setIsInputFocused(false);
              }}
              rightSection={null}
              variant="unstyled"
              size="md"
              required
              error={props.error}
            />
          </Combobox.Target>

          <Combobox.Dropdown
            hidden={
              (inputValue.trim().length === 0 &&
                debounced.trim().length === 0 &&
                !(
                  isInputFocused &&
                  (isLoadingRecentCards || recentCardsList.length > 0)
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
                    {isLoadingRecentCards ? (
                      <Stack gap={5} p={5}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Group key={i} gap="xs" align="center" wrap="nowrap">
                            <Skeleton height={35} width={35} radius="sm" />
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Skeleton height={12} width="70%" radius="xl" />
                              <Skeleton height={10} width="40%" radius="xl" />
                            </Stack>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      recentCardsList.map((card) => (
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
                              <Text
                                fw={500}
                                c={'bright'}
                                lineClamp={1}
                                size="sm"
                              >
                                {card.cardContent.title || card.url}
                              </Text>
                              <Text c={'gray'} lineClamp={1} size="xs">
                                {getDomain(card.url)}
                              </Text>
                            </Stack>
                          </Group>
                        </Combobox.Option>
                      ))
                    )}
                  </Fragment>
                ) : (
                  <Fragment>
                    {currentError && (
                      <Combobox.Empty>Could not search</Combobox.Empty>
                    )}
                    {!currentError && inputValue.trim() && (
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

                        {(hasSearchResults || true) && (
                          <Fragment>
                            <Text size="sm" fw={500} c="dimmed" py="xs" px={5}>
                              Search results
                            </Text>
                            <SegmentedControl
                              value={searchFilter}
                              onChange={(value) => {
                                setSearchFilter(value as SearchFilter);
                                combobox.resetSelectedOption();
                              }}
                              data={[
                                { label: 'Cards', value: 'cards' },
                                {
                                  label: 'Collections',
                                  value: 'collections',
                                },
                              ]}
                              size="xs"
                              mb="xs"
                            />
                          </Fragment>
                        )}
                      </Fragment>
                    )}
                    {searchFilter === 'cards' && (
                      <Fragment>
                        {isFetching ? (
                          <Stack gap={5} p={5}>
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Group
                                key={i}
                                gap="xs"
                                align="center"
                                wrap="nowrap"
                              >
                                <Skeleton height={35} width={35} radius="sm" />
                                <Stack gap={4} style={{ flex: 1 }}>
                                  <Skeleton
                                    height={12}
                                    width="70%"
                                    radius="xl"
                                  />
                                  <Skeleton
                                    height={10}
                                    width="40%"
                                    radius="xl"
                                  />
                                </Stack>
                              </Group>
                            ))}
                          </Stack>
                        ) : cardOptions.length > 0 ? (
                          <Fragment>{cardOptions}</Fragment>
                        ) : (
                          debounced.trim().length > 0 && (
                            <Combobox.Empty>No cards found</Combobox.Empty>
                          )
                        )}
                      </Fragment>
                    )}
                    {searchFilter === 'collections' && (
                      <Fragment>
                        {isCollectionSearchFetching ? (
                          <Stack gap={5} p={5}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Group
                                key={i}
                                gap="xs"
                                align="center"
                                justify="space-between"
                                wrap="nowrap"
                              >
                                <Skeleton height={20} width="70%" radius="xl" />
                                <Skeleton height={26} width={26} radius="md" />
                              </Group>
                            ))}
                          </Stack>
                        ) : collectionOptions.filter(Boolean).length > 0 ? (
                          <Fragment>{collectionOptions}</Fragment>
                        ) : (
                          debounced.trim().length > 0 && (
                            <Combobox.Empty>
                              No collections found
                            </Combobox.Empty>
                          )
                        )}
                      </Fragment>
                    )}
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
