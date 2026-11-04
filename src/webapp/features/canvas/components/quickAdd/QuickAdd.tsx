import { Group, Kbd, Loader, SegmentedControl, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { createSpotlight, Spotlight } from '@mantine/spotlight';
import { useEffect, useRef, useState } from 'react';
import { BiLink, BiSearch } from 'react-icons/bi';
import { useValue } from 'tldraw';
import UrlOptionRow from '@/features/cards/components/urlOptionRow/UrlOptionRow';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import type { QuickAdd as QuickAddController } from '../../controller/quickAdd';
import useQuickAddCollections from '../../lib/queries/useQuickAddCollections';
import useLinkSearch from '../../lib/queries/useLinkSearch';
import type { SearchScope } from '../../server/canvasServer';
import { linkKey } from '../../model/linkCards';
import CollectionOptionRow from './CollectionOptionRow';
import classes from './QuickAdd.module.css';

const SCOPES: { value: SearchScope; label: string }[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'everyone', label: 'Everyone' },
];

const MESSAGES: Record<
  SearchScope,
  { prompt: string; failed: string; noMatch: string }
> = {
  mine: {
    prompt: 'Paste a link or search your library',
    failed: "Couldn't search your library",
    noMatch: 'Nothing in your library matches',
  },
  everyone: {
    prompt: 'Paste a link or search all of Semble',
    failed: "Couldn't search Semble",
    noMatch: 'Nothing on Semble matches',
  },
};

interface Props {
  quickAdd: QuickAddController;
}

export default function QuickAdd(props: Props) {
  const [[store, spotlight]] = useState(createSpotlight);
  const searchRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [query] = useDebouncedValue(input.trim(), 200);
  const scope = useValue(props.quickAdd.scope);
  const isOpen = useValue(
    'quick-add open',
    () => props.quickAdd.placeAt.get() !== null,
    [props.quickAdd],
  );
  // Stays mounted with the board, so it only searches while open
  const links = useLinkSearch(scope, query, isOpen);
  const collections = useQuickAddCollections(scope, query, isOpen);
  const url = linkKey(input);
  const messages = MESSAGES[scope];
  const linkResults = url ? [] : (links.data ?? []);
  const collectionResults = url ? [] : collections.collections;

  // The controller opens quick-add; Spotlight keeps its own open state
  useEffect(() => {
    if (isOpen) spotlight.open();
    else spotlight.close();
  }, [isOpen, spotlight]);

  // Results land after the query selected its first one, so the next arrow
  // down starts at the top. A pasted link stays selected for Enter.
  const resultKeys = [
    ...linkResults.map((link) => link.url),
    ...collectionResults.map((collection) => collection.id),
  ].join(' ');
  useEffect(() => {
    if (!url) store.updateState((state) => ({ ...state, selected: -1 }));
  }, [resultKeys, url, store]);

  const emptyMessage = () => {
    if (links.isError && collections.isError) return messages.failed;
    if (links.isPending || collections.isPending) return 'Searching…';
    if (query) return messages.noMatch;
    return messages.prompt;
  };

  return (
    <Spotlight.Root
      store={store}
      shortcut={null}
      query={input}
      onQueryChange={setInput}
      onSpotlightClose={props.quickAdd.close}
      overlayProps={UPDATE_OVERLAY_PROPS}
      yOffset="8dvh"
      classNames={{ action: classes.action }}
      styles={{
        // Only the results shrink on a short screen; 7rem is the search and
        // the footer
        actionsList: {
          maxHeight:
            'min(420px, calc(100dvh - 2 * var(--modal-y-offset) - 7rem))',
        },
      }}
    >
      <Spotlight.Search
        ref={searchRef}
        aria-label={messages.prompt}
        placeholder={messages.prompt}
        leftSection={<BiSearch />}
        rightSection={
          (links.isFetching || collections.isFetching) && <Loader size="xs" />
        }
      />
      <Spotlight.ActionsList>
        {url && (
          <Spotlight.Action
            label="Place this link"
            description={url}
            leftSection={<BiLink />}
            onClick={() => props.quickAdd.place(url)}
          />
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
        {!url && !resultKeys && (
          <Spotlight.Empty>{emptyMessage()}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
      <Spotlight.Footer>
        <Group justify="space-between">
          <SegmentedControl
            value={scope}
            onChange={(value) => {
              props.quickAdd.setScope(value);
              searchRef.current?.focus();
            }}
            data={SCOPES}
            size="xs"
          />
          <Group gap="md" visibleFrom="xs">
            <Text size="xs" c="dimmed">
              <Kbd size="xs">↵</Kbd> Place
            </Text>
            <Text size="xs" c="dimmed">
              <Kbd size="xs">Esc</Kbd> Close
            </Text>
          </Group>
        </Group>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}
