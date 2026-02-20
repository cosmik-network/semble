export enum CardSaveSource {
  PROFILE = 'profile',
  SEMBLE_PAGE = 'semble_page',
  COLLECTION = 'collection',
  FEED = 'feed',
  SIMILAR_CARDS = 'similar_cards',
  NOTIFICATIONS = 'notifications',
  SEARCH_RESULTS = 'search_results',
  ADD_CARD_DRAWER = 'add_card_drawer',
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
}

export interface CardSaveEventProperties {
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
}
