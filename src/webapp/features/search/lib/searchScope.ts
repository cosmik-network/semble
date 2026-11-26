// Whose saves a search covers: the viewer's own, or anyone's on Semble
export type SearchScope = 'mine' | 'everyone';

export type SearchKind = 'cards' | 'collections';

export const SEARCH_SCOPES: { value: SearchScope; label: string }[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'everyone', label: 'Everyone' },
];

export const SEARCH_KINDS: { value: SearchKind; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'collections', label: 'Collections' },
];

export const SEARCH_MESSAGES: Record<
  SearchScope,
  { prompt: string; failed: string; noMatch: Record<SearchKind, string> }
> = {
  mine: {
    prompt: 'Paste a link or search your library',
    failed:
      "Couldn't search your library. Check your connection and try again.",
    noMatch: {
      cards: 'No cards in your library match',
      collections: 'None of your collections match',
    },
  },
  everyone: {
    prompt: 'Paste a link or search all of Semble',
    failed: "Couldn't search Semble. Check your connection and try again.",
    noMatch: {
      cards: 'No cards on Semble match',
      collections: 'No collections on Semble match',
    },
  },
};
