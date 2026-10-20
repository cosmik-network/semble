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
