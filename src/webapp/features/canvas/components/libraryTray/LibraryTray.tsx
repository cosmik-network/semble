import { useState } from 'react';
import {
  ActionIcon,
  Group,
  Loader,
  Scroller,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { Editor } from 'tldraw';
import { BiCollection } from 'react-icons/bi';
import { LuLibrary, LuSearch, LuX } from 'react-icons/lu';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import { useMyCardsInfinite } from '@/features/cards/lib/queries/useMyCards';
import useSearchCards from '@/features/cards/lib/queries/useSearchCards';
import { useMyCollectionsInfinite } from '@/features/collections/lib/queries/useMyCollections';
import { useCanvasSession } from '../../lib/canvasSession';
import {
  PanelCollectionItem,
  PanelUrlCardItem,
} from '../panelCardItem/PanelCardItem';
import styles from './LibraryTray.module.css';

interface Props {
  editor: Editor;
}

export default function LibraryTray(props: Props) {
  const session = useCanvasSession();

  return (
    <aside className={styles.root}>
      <Group justify="space-between" px="md" pt="sm">
        <Text fz="lg" fw={700}>
          Library
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          aria-label="Close library"
          onClick={() => session.trayOpen.set(false)}
        >
          <LuX />
        </ActionIcon>
      </Group>
      <Text size="sm" c="dimmed" px="md" pb="xs">
        Drag onto the canvas or into a collection
      </Text>
      <Tabs defaultValue="cards" className={styles.tabs} keepMounted={false}>
        <Tabs.List px="md" style={{ flexWrap: 'nowrap' }}>
          <Scroller>
            <Tabs.Tab value="cards" className={styles.tab}>
              Cards
            </Tabs.Tab>
            <Tabs.Tab value="collections" className={styles.tab}>
              Collections
            </Tabs.Tab>
            <Tabs.Tab value="search" className={styles.tab}>
              Search
            </Tabs.Tab>
          </Scroller>
        </Tabs.List>
        <Tabs.Panel value="cards" className={styles.panel}>
          <MyCards editor={props.editor} />
        </Tabs.Panel>
        <Tabs.Panel value="collections" className={styles.panel}>
          <MyCollections editor={props.editor} />
        </Tabs.Panel>
        <Tabs.Panel value="search" className={styles.panel}>
          <Search editor={props.editor} />
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}

function MyCards(props: Props) {
  const cards = useMyCardsInfinite({ limit: 30 });
  const all = cards.data?.pages.flatMap((p) => p.cards) ?? [];

  return (
    <ScrollArea h="100%" p="sm">
      {!cards.isPending && all.length === 0 ? (
        <EmptyState message="No cards yet" icon={LuLibrary} />
      ) : (
        <InfiniteScroll
          dataLength={all.length}
          hasMore={!!cards.hasNextPage}
          isInitialLoading={cards.isPending}
          isLoading={cards.isFetchingNextPage || cards.isPending}
          loadMore={cards.fetchNextPage}
          hideEndIndicator
        >
          {all.map((c) => (
            <PanelUrlCardItem
              origin="left"
              key={c.id}
              editor={props.editor}
              url={c.url}
              metadata={c.cardContent}
              note={c.note?.text}
            >
              <UrlCard
                id={c.id}
                url={c.url}
                uri={c.uri}
                cardContent={c.cardContent}
                note={c.note}
                cardAuthor={c.author}
                urlLibraryCount={c.urlLibraryCount}
                urlIsInLibrary={c.urlInLibrary}
                urlConnectionCount={c.urlConnectionCount ?? 0}
                urlIsConnected={c.urlIsConnected}
                viaCardId={c.id}
              />
            </PanelUrlCardItem>
          ))}
        </InfiniteScroll>
      )}
    </ScrollArea>
  );
}

function MyCollections(props: Props) {
  const [query, setQuery] = useState('');
  const collections = useMyCollectionsInfinite({ limit: 50 });

  const filtered = (
    collections.data?.pages.flatMap((p) => p.collections) ?? []
  ).filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Stack gap={0} h="100%">
      <TextInput
        m="sm"
        radius="xl"
        placeholder="Filter collections"
        leftSection={<LuSearch />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />
      <ScrollArea flex={1} px="sm" pb="sm">
        {!collections.isPending && filtered.length === 0 ? (
          <EmptyState message="No collections found" icon={BiCollection} />
        ) : (
          <InfiniteScroll
            dataLength={filtered.length}
            hasMore={!!collections.hasNextPage}
            isInitialLoading={collections.isPending}
            isLoading={collections.isFetchingNextPage || collections.isPending}
            loadMore={collections.fetchNextPage}
            hideEndIndicator
          >
            {filtered.map((c) => (
              <PanelCollectionItem
                key={c.id}
                editor={props.editor}
                collection={c}
              >
                <CollectionCard collection={c} />
              </PanelCollectionItem>
            ))}
          </InfiniteScroll>
        )}
      </ScrollArea>
    </Stack>
  );
}

function Search(props: Props) {
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query.trim(), 250);
  const results = useSearchCards({ searchQuery: debounced, limit: 20 });
  const urls = results.data?.pages.flatMap((p) => p.urls) ?? [];

  return (
    <Stack gap={0} h="100%">
      <TextInput
        m="sm"
        radius="xl"
        placeholder="Search everything on Semble"
        leftSection={<LuSearch />}
        rightSection={results.isFetching ? <Loader size={12} /> : null}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        autoFocus
      />
      <ScrollArea flex={1} px="sm" pb="sm">
        {!debounced ? (
          <EmptyState
            message="Find cards to bring onto the canvas"
            icon={LuSearch}
          />
        ) : !results.isFetching && urls.length === 0 ? (
          <EmptyState message="No results" icon={LuSearch} />
        ) : (
          <InfiniteScroll
            dataLength={urls.length}
            hasMore={!!results.hasNextPage}
            isInitialLoading={results.isPending}
            isLoading={results.isFetchingNextPage}
            loadMore={results.fetchNextPage}
            hideEndIndicator
          >
            {urls.map((u) => (
              <PanelUrlCardItem
                origin="left"
                key={u.url}
                editor={props.editor}
                url={u.url}
                metadata={u.metadata}
              >
                <SimilarUrlCard urlView={u} />
              </PanelUrlCardItem>
            ))}
          </InfiniteScroll>
        )}
      </ScrollArea>
    </Stack>
  );
}
