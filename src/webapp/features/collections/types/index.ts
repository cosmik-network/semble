interface SelectableCollectionItem {
  id: string;
  name: string;
  cardCount: number;
  uri?: string;
  author?: {
    handle: string;
  };
}
