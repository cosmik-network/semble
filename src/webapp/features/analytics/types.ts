export enum CardSaveSource {
  PROFILE = 'profile',
  SEMBLE_PAGE = 'semble_page',
  COLLECTION = 'collection',
  FEED = 'feed',
  SIMILAR_CARDS = 'similar_cards',
  NOTIFICATIONS = 'notifications',
  SEARCH_RESULTS = 'search_results',
  ADD_CARD_DRAWER = 'add_card_drawer',
  ONBOARDING = 'onboarding',
  RECOMMENDED = 'recommended',
  READER = 'reader',
}

export enum FollowSource {
  PROFILE_PAGE = 'profile_page',
  COLLECTION_PAGE = 'collection_page',
  PROFILE_NETWORK = 'profile_network',
  NOTIFICATIONS = 'notifications',
  RECOMMENDED = 'recommended',
  EXPLORE = 'explore',
  SEARCH_RESULTS = 'search_results',
  SEMBLE_PAGE = 'semble_page',
  LIBRARY = 'library',
  ONBOARDING = 'onboarding',
  BLUESKY_FOLLOWS = 'bluesky_follows',
}

/** Where the new connection form was opened from */
export enum ConnectionCreateSource {
  CARD = 'card',
  SEMBLE_PAGE = 'semble_page',
  COLLECTION_PAGE = 'collection_page',
  COMPOSER = 'composer',
}

/** How a link ended up in one end of a new connection */
export type ConnectionLinkInputMethod =
  // The link the form was opened for, e.g. the card the connect button is on
  | 'fixed'
  // Filled in by the opener: the semble page in its similar cards tab, or the
  // article in the reader
  | 'prefilled'
  | 'recent_card'
  | 'search_card'
  | 'search_collection'
  // Typed or pasted, then confirmed with "Add this link" or by submitting
  | 'pasted';

export interface ConnectionCreatedEventProperties {
  create_source: ConnectionCreateSource;
  /** The list the card was in, when created from a card's connect button */
  card_context?: CardSaveSource;
  connection_type: string;
  default_connection_type: string;
  connection_type_changed: boolean;
  /** The two ends ended up the other way round from how the form opened */
  swapped: boolean;
  swap_clicks: number;
  has_note: boolean;
  source_input_method?: ConnectionLinkInputMethod;
  target_input_method?: ConnectionLinkInputMethod;
  searched_links: boolean;
  /**
   * Left out when the UI doesn't know: pasted links, collection search
   * results, and the prefilled semble page link
   */
  source_in_library?: boolean;
  target_in_library?: boolean;
  page_path?: string;
}

export interface ConnectionUpdatedEventProperties {
  connection_type: string;
  previous_connection_type: string;
  connection_type_changed: boolean;
  swapped: boolean;
  note_change: 'added' | 'edited' | 'removed' | 'unchanged';
}

export interface CardSaveAnalyticsContext {
  saveSource: CardSaveSource;
  activeFilters?: {
    urlType?: string;
    sort?: string;
    searchQuery?: string;
    profileFilter?: string;
  };
  pagePath?: string;
  /** 1-based place of the card in the list it was saved from */
  listPosition?: number;
}

/** How the collections a save added were picked; see useCollectionPicks */
export interface CollectionPickEventProperties {
  collections_from_my_collections: number;
  collections_from_recommended: number;
  collections_from_open_collections: number;
  collections_from_composer_chip: number;
  collections_created: number;
  collections_via_search: number;
  collection_tabs_viewed: string[];
  collection_tabs_searched: string[];
  searched_collections: boolean;
}

export interface CardSaveEventProperties extends Partial<CollectionPickEventProperties> {
  save_source: CardSaveSource;
  is_new_card: boolean;
  has_note: boolean;
  collection_count: number;
  active_filters?: {
    url_type?: string;
    sort?: string;
    search_query?: string;
    profile_filter?: string;
  };
  via_card_id?: string;
  page_path?: string;
  list_position?: number;
}
