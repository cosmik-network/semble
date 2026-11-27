'use client';

import {
  Button,
  Card,
  Combobox,
  type ComboboxProps,
  Group,
  Input,
  Loader,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  type TextInputProps,
  ThemeIcon,
  useCombobox,
  VisuallyHidden,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { BiLink, BiPlus } from 'react-icons/bi';
import type { Collection } from '@semble/types';
import { getCollectionPageUrl } from '@/lib/utils/link';
import { getRecordKey } from '@/lib/utils/atproto';
import { useScrollFade } from '@/hooks/useScrollFade';
import { linkKey } from '@/features/canvas/model/linkCards';
import UrlOptionRow from '@/features/cards/components/urlOptionRow/UrlOptionRow';
import useScopedLinkSearch from '@/features/cards/lib/queries/useScopedLinkSearch';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import CollectionOptionRow from '@/features/collections/components/collectionOptionRow/CollectionOptionRow';
import useScopedCollectionSearch from '@/features/collections/lib/queries/useScopedCollectionSearch';
import {
  SEARCH_KINDS,
  SEARCH_MESSAGES,
  SEARCH_SCOPES,
  type SearchKind,
  type SearchScope,
} from '@/features/search/lib/searchScope';
import type { ConnectionLinkInputMethod } from '@/features/analytics/types';
import SourceCardPreview from './SourceCardPreview';
import classes from './UrlSearchInput.module.css';

const NOUNS: Record<SearchKind, [string, string]> = {
  cards: ['card', 'cards'],
  collections: ['collection', 'collections'],
};

const VIEWPORT_MARGIN = 8;
// The create row's option value; no URL can look like it
const CREATE_COLLECTION = 'create-collection';

// How close to the end of the list the next page starts loading
const LOAD_MORE_DISTANCE = 120;
// About two rows, so a cramped list still shows something to scroll
const MIN_LIST_HEIGHT = 96;

// Opens on whichever side of the input has more room, and the results list
// shrinks to the space left there, so nothing runs off screen
const DROPDOWN_MIDDLEWARES: ComboboxProps['middlewares'] = {
  flip: { padding: VIEWPORT_MARGIN },
  shift: true,
  size: {
    padding: VIEWPORT_MARGIN,
    apply: ({ availableHeight, elements }) => {
      // The filters, the list's padding and the dropdown's border
      const filters = elements.floating.querySelector<HTMLElement>(
        `.${classes.filters}`,
      );
      const chrome = (filters?.offsetHeight ?? 0) + 10;
      const listMax = Math.max(availableHeight - chrome, MIN_LIST_HEIGHT);
      elements.floating.style.setProperty(
        '--url-search-list-max',
        `${listMax}px`,
      );
    },
  },
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// The input as an http(s) link, with https:// added to a bare domain like
// example.com/post. Null for anything else, e.g. search words.
function toLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
  // Another scheme (mailto:, javascript:) or an email address isn't a page
  if (
    !hasScheme &&
    (/^[a-z][a-z\d+.-]*:\D/i.test(trimmed) || /^[^/]*@/.test(trimmed))
  )
    return null;
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!hasScheme && !/\.[a-z]{2,}$/i.test(url.hostname)) return null;
    return candidate;
  } catch {
    return null;
  }
}

function collectionPageUrl(collection: {
  uri?: string;
  author: { handle: string };
}): string | null {
  const rkey = collection.uri && getRecordKey(collection.uri);
  if (!rkey) return null;
  return getCollectionPageUrl({ handle: collection.author.handle, rkey });
}

interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: React.ReactNode;
  /**
   * `method` is left out when the link is cleared. `inLibrary` is whether the
   * user already has the link, when the picked option says so.
   */
  onUrlSelect: (
    url: string,
    method?: ConnectionLinkInputMethod,
    inLibrary?: boolean,
  ) => void;
  onUrlClear?: () => void;
  onInputChange?: (rawValue: string) => void;
  /**
   * When provided, the input is rendered as a standard Mantine `TextInput`
   * (with a visible label) and these props are spread onto it. Use this to
   * customize variant, size, leftSection, etc. When omitted, the input keeps
   * the legacy card-wrapped unstyled layout used by the connection form.
   */
  inputProps?: Omit<
    TextInputProps,
    | 'id'
    | 'label'
    | 'placeholder'
    | 'value'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'error'
    | 'required'
  > & { [K in `data-${string}`]?: unknown };
}

export default function UrlSearchInput(props: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [inputValue, setInputValue] = useState(props.value);
  const [confirmedUrl, setConfirmedUrl] = useState<string | null>(
    isValidUrl(props.value) ? props.value : null,
  );
  const [query] = useDebouncedValue(inputValue.trim(), 200);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const {
    setViewport: setScrollFadeViewport,
    maskImage,
    updateFade,
  } = useScrollFade();
  const [kind, setKind] = useState<SearchKind>('cards');
  const [scope, setScope] = useState<SearchScope>('mine');

  const typedLink = toLink(inputValue);
  // The name a new collection starts with, while its drawer is open
  const [newCollectionName, setNewCollectionName] = useState<string | null>(
    null,
  );
  const isOpen = combobox.dropdownOpened;
  const links = useScopedLinkSearch(scope, query, isOpen && kind === 'cards');
  const collections = useScopedCollectionSearch(
    scope,
    query,
    isOpen && kind === 'collections',
  );
  const active = kind === 'cards' ? links : collections;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const messages = SEARCH_MESSAGES[scope];

  const linkResults = kind === 'cards' ? (links.data ?? []) : [];
  const collectionResults = (
    kind === 'collections' ? collections.collections : []
  ).flatMap((collection) => {
    const url = collectionPageUrl(collection);
    return url ? [{ collection, url }] : [];
  });

  // Sync when the external value changes (e.g. after swap)
  const [prevValue, setPrevValue] = useState(props.value);
  if (props.value !== prevValue) {
    setInputValue(props.value);
    setPrevValue(props.value);
    setConfirmedUrl(isValidUrl(props.value) ? props.value : null);
  }

  const resultKeys = [
    ...linkResults.map((link) => link.url),
    ...collectionResults.map((result) => result.url),
  ].join(' ');
  // A link no result is for can still be added as it is
  const linkToAdd =
    typedLink &&
    !linkResults.some((link) => linkKey(link.url) === linkKey(typedLink))
      ? typedLink
      : null;

  const loadMoreNearEnd = () => {
    const el = viewportRef.current;
    // A failed page waits for Retry rather than looping
    if (
      !el ||
      !active.hasNextPage ||
      active.isFetching ||
      active.isFetchNextPageError
    )
      return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < LOAD_MORE_DISTANCE) active.fetchNextPage();
  };

  const setViewport = useCallback(
    (el: HTMLDivElement) => {
      viewportRef.current = el;
      const cleanup = setScrollFadeViewport(el);
      return () => {
        cleanup();
        viewportRef.current = null;
      };
    },
    [setScrollFadeViewport],
  );

  // A page that doesn't fill the list can't be scrolled to load the next
  useEffect(() => {
    if (isOpen) loadMoreNearEnd();
  });

  // Appended pages keep the selection, so only the first result counts
  const resultsHead = [
    kind,
    scope,
    query,
    linkResults[0]?.url,
    collectionResults[0]?.url,
  ].join(' ');

  // New results start unselected so arrow down begins at the top; with a
  // link typed, the first option is selected so Enter takes it
  useEffect(() => {
    if (typedLink) combobox.selectFirstOption();
    else combobox.resetSelectedOption();
    // The store is a new object each render; its methods read refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsHead, typedLink]);

  const handleClear = () => {
    setConfirmedUrl(null);
    setInputValue('');
    props.onUrlSelect('');
    props.onUrlClear?.();
  };

  const selectUrl = (url: string, method: ConnectionLinkInputMethod) => {
    props.onUrlSelect(url, method);
    setInputValue(url);
    if (isValidUrl(url)) setConfirmedUrl(url);
  };

  const handleCollectionCreated = (collection: Collection) => {
    const url = collectionPageUrl(collection);
    if (url) selectUrl(url, 'created_collection');
  };

  // Stays mounted once the new collection is picked, so it closes smoothly
  const createCollectionDrawer = (
    <CreateCollectionDrawer
      isOpen={newCollectionName !== null}
      onClose={() => setNewCollectionName(null)}
      initialName={newCollectionName ?? undefined}
      onCreate={handleCollectionCreated}
    />
  );

  if (confirmedUrl) {
    return (
      <Fragment>
        <SourceCardPreview sourceUrl={confirmedUrl} onRemove={handleClear} />
        {createCollectionDrawer}
        <VisuallyHidden>
          <Input.Label htmlFor={props.id} required>
            {props.label}
          </Input.Label>
        </VisuallyHidden>
      </Fragment>
    );
  }

  // New collections are the viewer's own, so only offered with their own
  const canCreate = !linkToAdd && kind === 'collections' && scope === 'mine';
  const newName = inputValue.trim();

  const emptyMessage = () => {
    if (active.isError) return messages.failed;
    if (active.isPending) return 'Searching…';
    // The create row stands in for no matches
    if (query) return canCreate ? null : messages.noMatch[kind];
    return messages.prompt;
  };

  const handleOptionSubmit = (url: string) => {
    if (url === CREATE_COLLECTION) {
      setNewCollectionName(inputValue.trim());
      combobox.closeDropdown();
      return;
    }
    // From the row picked, since the query can lag the rows on screen
    const link = linkResults.find((result) => result.url === url);
    const method: ConnectionLinkInputMethod =
      url === linkToAdd
        ? 'pasted'
        : kind === 'collections'
          ? 'search_collection'
          : link?.isRecent
            ? 'recent_card'
            : 'search_card';
    const inLibrary = link?.inLibrary;
    props.onUrlSelect(url, method, inLibrary);
    setInputValue(url);
    if (isValidUrl(url)) setConfirmedUrl(url);
    combobox.closeDropdown();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    setInputValue(val);
    props.onInputChange?.(val);
    combobox.openDropdown();
  };

  // Focus can move between the input and the filters without closing
  const handleBlur = (event: React.FocusEvent) => {
    const next = event.relatedTarget;
    if (next === inputRef.current) return;
    if (controlsRef.current?.contains(next)) return;
    combobox.closeDropdown();
  };

  // The dropdown sits in a portal outside the drawer's focus trap, so Tab
  // is walked by hand: input, kind, scope, then back to the input closed
  const filterGroups = () =>
    Array.from(
      controlsRef.current?.querySelectorAll<HTMLElement>(
        '[role="radiogroup"]',
      ) ?? [],
    );
  const focusGroup = (group: HTMLElement | undefined) =>
    group?.querySelector<HTMLInputElement>('input:checked')?.focus();

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || event.shiftKey || !combobox.dropdownOpened) {
      return;
    }
    event.preventDefault();
    focusGroup(filterGroups()[0]);
  };

  const handleControlsKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Focus first: focusing the input opens the dropdown
      inputRef.current?.focus();
      combobox.closeDropdown();
      return;
    }
    if (event.key !== 'Tab') return;
    event.preventDefault();
    // Keeps the drawer's focus trap from handling it too
    event.stopPropagation();
    const groups = filterGroups();
    const index = groups.findIndex((group) =>
      group.contains(event.target as Node),
    );
    const next = index + (event.shiftKey ? -1 : 1);
    if (next >= 0 && next < groups.length) {
      focusGroup(groups[next]);
      return;
    }
    inputRef.current?.focus();
    // Past the last filter, the next Tab leaves the field
    if (!event.shiftKey) combobox.closeDropdown();
  };

  // Escape on a radio would otherwise close the drawer too, as Mantine only
  // spares elements marked like the combobox input
  const setControls = (node: HTMLDivElement | null) => {
    controlsRef.current = node;
    node?.querySelectorAll('input').forEach((radio) => {
      radio.setAttribute('data-mantine-stop-propagation', 'true');
    });
  };

  // What a screen reader hears as results land; quiet until there's a query
  const statusMessage = () => {
    if (!isOpen || !query) return '';
    const count = linkResults.length + collectionResults.length;
    const failedMore = active.isFetchNextPageError
      ? ". Couldn't load more"
      : '';
    const found =
      (active.isError && !active.isFetchNextPageError) ||
      active.isPending ||
      count === 0
        ? (emptyMessage() ?? messages.noMatch[kind])
        : `${count} ${NOUNS[kind][count === 1 ? 0 : 1]}${failedMore}`;
    return linkToAdd ? `${found}. Add this link is selected` : found;
  };

  const clearInput = () => {
    setInputValue('');
    props.onInputChange?.('');
    inputRef.current?.focus();
    combobox.openDropdown();
  };

  const hasInput = inputValue.length > 0;
  // The list shows its own spinner for a further page
  const isSearching = active.isFetching && !active.isFetchingNextPage;
  const rightSection = (isSearching || hasInput) && (
    <Group gap={4} wrap="nowrap">
      {isSearching && <Loader size="xs" />}
      {hasInput && (
        <Input.ClearButton
          aria-label="Clear search"
          // Keeps focus in the input, so the dropdown stays open
          onMouseDown={(event) => event.preventDefault()}
          onClick={clearInput}
        />
      )}
    </Group>
  );
  // Room for the spinner beside the clear button
  const rightSectionWidth = isSearching && hasInput ? 56 : undefined;

  const isPlainLayout = !!props.inputProps;

  const inputElement = isPlainLayout ? (
    <TextInput
      {...props.inputProps}
      id={props.id}
      label={props.label}
      placeholder={props.placeholder}
      value={inputValue}
      onChange={handleInputChange}
      onFocus={() => combobox.openDropdown()}
      ref={inputRef}
      onBlur={handleBlur}
      onKeyDown={handleInputKeyDown}
      rightSection={rightSection || props.inputProps?.rightSection}
      rightSectionWidth={rightSectionWidth}
      error={props.error}
      required
    />
  ) : (
    <Input
      id={props.id}
      component="input"
      type="text"
      py={2.5}
      placeholder={props.placeholder}
      value={inputValue}
      onChange={handleInputChange}
      onFocus={() => combobox.openDropdown()}
      ref={inputRef}
      onBlur={handleBlur}
      onKeyDown={handleInputKeyDown}
      rightSection={rightSection || null}
      rightSectionWidth={rightSectionWidth}
      variant="unstyled"
      size="md"
      required
      error={props.error}
    />
  );

  const comboboxBlock = (
    <Combobox
      shadow="sm"
      radius="lg"
      store={combobox}
      middlewares={DROPDOWN_MIDDLEWARES}
      position="bottom-start"
      onOptionSubmit={handleOptionSubmit}
      classNames={{ option: classes.option }}
    >
      {isPlainLayout ? (
        <Combobox.Target>{inputElement}</Combobox.Target>
      ) : (
        // The dropdown lines up with the card the input sits in, while the
        // input still drives it
        <Combobox.DropdownTarget>
          <Card padding="xs" radius="lg" withBorder>
            <Stack gap={0}>
              <Combobox.EventsTarget>{inputElement}</Combobox.EventsTarget>
              <VisuallyHidden>
                <Input.Label htmlFor={props.id} required>
                  {props.label}
                </Input.Label>
              </VisuallyHidden>
            </Stack>
          </Card>
        </Combobox.DropdownTarget>
      )}

      <Combobox.Dropdown
        p={0}
        // Pressing anywhere in it, such as a filter label or the scrollbar,
        // would blur the input and close it
        onMouseDown={(event) => event.preventDefault()}
      >
        <Combobox.Options className={classes.options}>
          <ScrollArea.Autosize
            type="scroll"
            mah={{
              base: 'min(180px, var(--url-search-list-max, 180px))',
              xs: 'min(320px, var(--url-search-list-max, 320px))',
            }}
            offsetScrollbars="present"
            overscrollBehavior="contain"
            viewportRef={setViewport}
            onScrollPositionChange={() => {
              updateFade();
              loadMoreNearEnd();
            }}
            classNames={{ viewport: classes.list }}
            styles={{
              viewport: maskImage
                ? { maskImage, WebkitMaskImage: maskImage }
                : undefined,
            }}
          >
            {linkToAdd && (
              <Combobox.Option value={linkToAdd}>
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" size={35} radius="md">
                    <BiLink size={18} />
                  </ThemeIcon>
                  <Stack gap={0} flex={1} miw={0}>
                    <Text fw={500} c="bright" size="sm">
                      Add this link
                    </Text>
                    <Text c="gray" size="xs" lineClamp={1}>
                      {linkToAdd}
                    </Text>
                  </Stack>
                </Group>
              </Combobox.Option>
            )}
            {canCreate && (
              <Combobox.Option value={CREATE_COLLECTION}>
                <Group gap="xs" wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" size={35} radius="md">
                    <BiPlus size={18} />
                  </ThemeIcon>
                  <Text fw={500} c="bright" size="sm" lineClamp={1}>
                    {newName
                      ? `Create new collection "${newName}"`
                      : 'Create new collection'}
                  </Text>
                </Group>
              </Combobox.Option>
            )}
            {linkResults.map((link) => (
              <Combobox.Option key={link.url} value={link.url}>
                <UrlOptionRow
                  url={link.url}
                  title={link.title}
                  imageUrl={link.imageUrl}
                />
              </Combobox.Option>
            ))}
            {collectionResults.map((result) => (
              <Combobox.Option key={result.collection.id} value={result.url}>
                <CollectionOptionRow collection={result.collection} />
              </Combobox.Option>
            ))}
            {active.isFetchNextPageError && (
              <Group justify="center" gap={4} py="xs">
                <Text size="xs" c="dimmed">
                  Couldn&rsquo;t load more
                </Text>
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-xs"
                  onClick={() => active.fetchNextPage()}
                >
                  Retry
                </Button>
              </Group>
            )}
            {active.isFetchingNextPage && (
              <Group justify="center" py="xs">
                <Loader size="xs" color="gray" />
              </Group>
            )}
            {!linkToAdd && !resultKeys && emptyMessage() && (
              <Combobox.Empty>{emptyMessage()}</Combobox.Empty>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
        {/* Below the results, so they start right under the input */}
        <div
          ref={setControls}
          className={classes.filters}
          // Back to the input after a pointer click; arrow keys on the radios
          // also fire clicks, with no detail, and keep focus where it is
          onClick={(event) => {
            if (event.detail > 0) inputRef.current?.focus();
          }}
          onBlur={handleBlur}
          onKeyDown={handleControlsKeyDown}
        >
          <SegmentedControl
            value={kind}
            onChange={(value) => setKind(value as SearchKind)}
            data={SEARCH_KINDS}
            aria-label="Search for"
            size="xs"
          />
          <SegmentedControl
            value={scope}
            onChange={(value) => setScope(value as SearchScope)}
            data={SEARCH_SCOPES}
            aria-label="Search in"
            size="xs"
          />
        </div>
      </Combobox.Dropdown>
    </Combobox>
  );

  return (
    <Fragment>
      {comboboxBlock}
      <VisuallyHidden role="status">{statusMessage()}</VisuallyHidden>
      {createCollectionDrawer}
    </Fragment>
  );
}
