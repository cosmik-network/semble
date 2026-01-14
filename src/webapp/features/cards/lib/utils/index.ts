import { CardSortField, SortOrder } from '@semble/types';

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
