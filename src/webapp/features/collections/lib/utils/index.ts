import { CollectionSortField, SortOrder } from '@semble/types';

export const getCollectionsSortParams = (field: CollectionSortField) => {
  switch (field) {
    case CollectionSortField.NAME:
      return {
        sortBy: CollectionSortField.NAME,
        sortOrder: SortOrder.ASC,
      };

    case CollectionSortField.CREATED_AT:
      return {
        sortBy: CollectionSortField.CREATED_AT,
        sortOrder: SortOrder.DESC,
      };

    case CollectionSortField.UPDATED_AT:
      return {
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      };

    case CollectionSortField.CARD_COUNT:
      return {
        sortBy: CollectionSortField.CARD_COUNT,
        sortOrder: SortOrder.DESC,
      };

    default:
      return {
        sortBy: CollectionSortField.UPDATED_AT,
        sortOrder: SortOrder.DESC,
      };
  }
};
