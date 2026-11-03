import { useMemo, useRef } from 'react';
import { CollectionPickEventProperties } from '@/features/analytics/types';

export type CollectionSelectorTab =
  | 'my_collections'
  | 'recommended'
  | 'open_collections';

export type CollectionPickSource =
  | CollectionSelectorTab
  // The quick-pick buttons under the composer's note field
  | 'composer_chip'
  // Created from the selector's "Create new collection" button
  | 'created';

export interface CollectionPickTracker {
  pick(
    collectionId: string,
    source: CollectionPickSource,
    viaSearch: boolean,
  ): void;
  unpick(collectionId: string): void;
  tabViewed(tab: CollectionSelectorTab): void;
  searched(tab: CollectionSelectorTab): void;
}

interface Pick {
  source: CollectionPickSource;
  viaSearch: boolean;
}

/**
 * Remembers how each collection in a save was picked, for the `card_saved`
 * event. The selection itself is a plain Collection[], so this rides
 * alongside it. The last tick wins: a collection listed in two tabs counts
 * for the one it was ticked in.
 */
export default function useCollectionPicks() {
  const picks = useRef(new Map<string, Pick>());
  const tabsViewed = useRef(new Set<CollectionSelectorTab>());
  const tabsSearched = useRef(new Set<CollectionSelectorTab>());

  return useMemo(() => {
    const tracker: CollectionPickTracker = {
      pick: (id, source, viaSearch) =>
        picks.current.set(id, { source, viaSearch }),
      unpick: (id) => picks.current.delete(id),
      tabViewed: (tab) => tabsViewed.current.add(tab),
      searched: (tab) => tabsSearched.current.add(tab),
    };

    /**
     * Freezes what has been recorded so far, for saves that reset the form
     * before they know which collections were really added. The returned
     * function takes the collections the save added; anything the card was
     * already in, or that came preselected, must be left out by the caller.
     */
    const snapshot = () => {
      const frozenPicks = new Map(picks.current);
      const viewed = Array.from(tabsViewed.current);
      const searched = Array.from(tabsSearched.current);

      return (addedIds: string[]): CollectionPickEventProperties => {
        const added = addedIds.flatMap((id) => frozenPicks.get(id) ?? []);
        const count = (source: CollectionPickSource) =>
          added.filter((p) => p.source === source).length;

        return {
          collections_from_my_collections: count('my_collections'),
          collections_from_recommended: count('recommended'),
          collections_from_open_collections: count('open_collections'),
          collections_from_composer_chip: count('composer_chip'),
          collections_created: count('created'),
          collections_via_search: added.filter((p) => p.viaSearch).length,
          collection_tabs_viewed: viewed,
          collection_tabs_searched: searched,
          searched_collections: searched.length > 0,
        };
      };
    };

    const reset = () => {
      picks.current.clear();
      tabsViewed.current.clear();
      tabsSearched.current.clear();
    };

    return { tracker, snapshot, reset };
  }, []);
}
