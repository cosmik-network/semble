import {
  Button,
  Group,
  Kbd,
  Loader,
  SegmentedControl,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { createSpotlight, Spotlight, useSpotlight } from '@mantine/spotlight';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { BiLink, BiPlus, BiSearch } from 'react-icons/bi';
import { useValue } from 'tldraw';
import UrlOptionRow from '@/features/cards/components/urlOptionRow/UrlOptionRow';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import type { QuickAdd as QuickAddController } from '../../controller/quickAdd';
import useScopedCollectionSearch from '@/features/collections/lib/queries/useScopedCollectionSearch';
import useLinkSearch from '../../lib/queries/useLinkSearch';
import { linkKey } from '../../model/linkCards';
import {
  SEARCH_KINDS,
  SEARCH_MESSAGES,
  SEARCH_SCOPES,
} from '@/features/search/lib/searchScope';
import CollectionOptionRow from '@/features/collections/components/collectionOptionRow/CollectionOptionRow';
import classes from './QuickAdd.module.css';

interface Props {
  quickAdd: QuickAddController;
}

// How close to the end of the list the next page starts loading
const LOAD_MORE_DISTANCE = 120;
const LOAD_MORE_MARGIN = `0px 0px ${LOAD_MORE_DISTANCE}px 0px`;

export default function QuickAdd(props: Props) {
  const [[store, spotlight]] = useState(createSpotlight);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isNearEnd, setIsNearEnd] = useState(false);
  const endMarkerRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState('');
  const [query] = useDebouncedValue(input.trim(), 200);
  const scope = useValue(props.quickAdd.scope);
  const kind = useValue(props.quickAdd.kind);
  const isOpen = useValue(
    'quick-add open',
    () => props.quickAdd.placeAt.get() !== null,
    [props.quickAdd],
  );
  // Stays mounted with the board, so it only searches while open
  const links = useLinkSearch(scope, query, isOpen && kind === 'cards');
  const collections = useScopedCollectionSearch(
    scope,
    query,
    isOpen && kind === 'collections',
  );
  const active = kind === 'cards' ? links : collections;
  const url = linkKey(input);
  const messages = SEARCH_MESSAGES[scope];
  const linkResults = url || kind !== 'cards' ? [] : (links.data ?? []);
  const collectionResults =
    url || kind !== 'collections' ? [] : collections.collections;
  // New collections are the viewer's own, so only offered with their own
  const canCreate = !url && kind === 'collections' && scope === 'mine';
  // The create row is first, so Enter on it creates rather than places
  const isCreateSelected = useSpotlight(store).selected === 0 && canCreate;
  const newName = input.trim();
  const creating = useValue(props.quickAdd.creating);

  // The controller opens quick-add; Spotlight keeps its own open state
  useEffect(() => {
    if (isOpen) spotlight.open();
    else spotlight.close();
  }, [isOpen, spotlight]);

  const resultKeys = [
    ...linkResults.map((link) => link.url),
    ...collectionResults.map((collection) => collection.id),
  ].join(' ');
  // Appended pages keep the selection, so only the first result counts
  const resultsHead = [
    kind,
    scope,
    query,
    linkResults[0]?.url,
    collectionResults[0]?.id,
  ].join(' ');
  // Results land after the query selected its first one, so the next arrow
  // down starts at the top. A pasted link stays selected for Enter.
  useEffect(() => {
    if (!url) store.setState((state) => ({ ...state, selected: -1 }));
  }, [resultsHead, url, store]);

  // Watches the end of the list from inside Spotlight's scroll area, whose
  // viewport it doesn't hand out
  const setEndMarker = useCallback((el: HTMLDivElement | null) => {
    endMarkerRef.current = el;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsNearEnd(entry.isIntersecting),
      {
        root: el.closest('[data-scrollarea-viewport]'),
        rootMargin: LOAD_MORE_MARGIN,
      },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setIsNearEnd(false);
    };
  }, []);

  // A failed page waits for Retry rather than looping
  const canLoadMore =
    isNearEnd &&
    active.hasNextPage &&
    !active.isFetching &&
    !active.isFetchNextPageError;
  const { fetchNextPage } = active;
  const loadedCount = linkResults.length + collectionResults.length;
  useEffect(() => {
    if (!canLoadMore) return;
    // The observer's last report predates the rows that just landed, so the
    // marker is measured again. Also loads when a page doesn't fill the list.
    const marker = endMarkerRef.current;
    const viewport = marker?.closest('[data-scrollarea-viewport]');
    if (!marker || !viewport) return;
    const distance =
      marker.getBoundingClientRect().top -
      viewport.getBoundingClientRect().bottom;
    if (distance < LOAD_MORE_DISTANCE) fetchNextPage();
  }, [canLoadMore, fetchNextPage, loadedCount]);

  // The list shows its own spinner for a further page
  const isSearching = active.isFetching && !active.isFetchingNextPage;

  const emptyMessage = () => {
    if (active.isError) return messages.failed;
    if (active.isPending) return 'Searching…';
    // The create row stands in for no matches
    if (query) return canCreate ? null : messages.noMatch[kind];
    return messages.prompt;
  };

  return (
    <Fragment>
      <Spotlight.Root
        store={store}
        shortcut={null}
        query={input}
        onQueryChange={setInput}
        onSpotlightClose={props.quickAdd.close}
        overlayProps={UPDATE_OVERLAY_PROPS}
        yOffset="8dvh"
        classNames={{
          action: classes.action,
          actionsList: classes.actionsList,
          footer: classes.footer,
        }}
        styles={{
          // Only the results shrink on a short screen; 9.5rem is the search,
          // the kind control and the footer
          actionsList: {
            maxHeight:
              'min(420px, calc(100dvh - 2 * var(--modal-y-offset) - 9.5rem))',
          },
        }}
      >
        <Spotlight.Search
          ref={searchRef}
          aria-label={messages.prompt}
          placeholder={messages.prompt}
          leftSection={<BiSearch />}
          rightSection={isSearching && <Loader size="xs" />}
          onKeyDown={(event) => {
            // Mantine moves the selection after this without telling
            // useSpotlight, which the footer hint reads
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              queueMicrotask(() => store.setState({ ...store.getState() }));
            }
          }}
        />
        {!url && (
          <div className={classes.kinds}>
            <SegmentedControl
              value={kind}
              onChange={(value) => {
                props.quickAdd.setKind(value);
                searchRef.current?.focus();
              }}
              data={SEARCH_KINDS}
              aria-label="Search for"
              size="xs"
            />
          </div>
        )}
        <Spotlight.ActionsList>
          {url && (
            <Spotlight.Action
              label="Place this link"
              description={url}
              leftSection={<BiLink />}
              onClick={() => props.quickAdd.place(url)}
            />
          )}
          {canCreate && (
            <Spotlight.Action
              onClick={() => {
                props.quickAdd.startCreate(newName);
              }}
            >
              <Group gap="xs" wrap="nowrap" w="100%">
                <ThemeIcon variant="light" color="gray" size={35} radius="md">
                  <BiPlus size={18} />
                </ThemeIcon>
                <Text fw={500} c="bright" lineClamp={1} size="sm">
                  {newName
                    ? `Create new collection "${newName}"`
                    : 'Create new collection'}
                </Text>
              </Group>
            </Spotlight.Action>
          )}
          {linkResults.map((link) => (
            <Spotlight.Action
              key={link.url}
              onClick={() => props.quickAdd.place(link.url)}
            >
              <UrlOptionRow
                url={link.url}
                title={link.title}
                imageUrl={link.imageUrl}
              />
            </Spotlight.Action>
          ))}
          {collectionResults.map((collection) => (
            <Spotlight.Action
              key={collection.id}
              onClick={() => props.quickAdd.placeCollection(collection.id)}
            >
              <CollectionOptionRow collection={collection} />
            </Spotlight.Action>
          ))}
          {!url && active.isFetchingNextPage && (
            <Group justify="center" py="xs">
              <Loader size="xs" color="gray" />
            </Group>
          )}
          {!url && !resultKeys && emptyMessage() && (
            <Spotlight.Empty>{emptyMessage()}</Spotlight.Empty>
          )}
          {!url && active.isFetchNextPageError && (
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
          {!url && <div ref={setEndMarker} />}
        </Spotlight.ActionsList>
        <Spotlight.Footer>
          <Group justify="space-between">
            <SegmentedControl
              value={scope}
              onChange={(value) => {
                props.quickAdd.setScope(value);
                searchRef.current?.focus();
              }}
              data={SEARCH_SCOPES}
              aria-label="Search in"
              size="xs"
            />
            <Group gap="md" visibleFrom="xs">
              <Text size="xs" c="dimmed">
                <Kbd size="xs">↵</Kbd> {isCreateSelected ? 'Create' : 'Place'}
              </Text>
              <Text size="xs" c="dimmed">
                <Kbd size="xs">Esc</Kbd> Close
              </Text>
            </Group>
          </Group>
        </Spotlight.Footer>
      </Spotlight.Root>
      <CreateCollectionDrawer
        isOpen={creating !== null}
        onClose={props.quickAdd.cancelCreate}
        initialName={creating?.name}
        onCreatedId={props.quickAdd.finishCreate}
      />
    </Fragment>
  );
}
