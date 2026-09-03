import { CardSortField, SortOrder, UrlView } from '@semble/types';

export const getCardsSortParams = (field: CardSortField) => {
  switch (field) {
    case CardSortField.UPDATED_AT:
      return {
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      };

    case CardSortField.CREATED_AT:
      return {
        sortBy: CardSortField.CREATED_AT,
        sortOrder: SortOrder.ASC,
      };

    case CardSortField.LIBRARY_COUNT:
      return {
        sortBy: CardSortField.LIBRARY_COUNT,
        sortOrder: SortOrder.DESC,
      };

    default:
      return {
        sortBy: CardSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      };
  }
};

/**
 * Collapse repeats by URL. Both the recommendation and search endpoints can
 * return the same URL more than once (and across pages), which would otherwise
 * render duplicate cards sharing a React key.
 */
export const dedupeUrlViews = (urls: UrlView[]): UrlView[] => {
  const seen = new Set<string>();
  return urls.filter((urlView) => {
    if (seen.has(urlView.url)) return false;
    seen.add(urlView.url);
    return true;
  });
};
