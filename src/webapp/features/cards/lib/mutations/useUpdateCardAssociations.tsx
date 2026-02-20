import { createSembleClient } from '@/services/client.apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { noteKeys } from '@/features/notes/lib/noteKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import posthog from 'posthog-js';
import {
  CardSaveAnalyticsContext,
  CardSaveEventProperties,
} from '@/features/analytics/types';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';

export default function useUpdateCardAssociations(
  analyticsContext?: CardSaveAnalyticsContext,
) {
  const client = createSembleClient();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updatedCard: {
      cardId: string;
      note?: string;
      addToCollectionIds?: string[];
      removeFromCollectionIds?: string[];
      viaCardId?: string;
      addToLibrary?: boolean;
    }) => {
      return client.updateUrlCardAssociations({
        cardId: updatedCard.cardId,
        note: updatedCard.note,
        addToCollections: updatedCard.addToCollectionIds,
        removeFromCollections: updatedCard.removeFromCollectionIds,
        viaCardId: updatedCard.viaCardId,
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });

      // invalidate each collection query individually
      variables.addToCollectionIds?.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: collectionKeys.collection(id),
        });
      });

      variables.removeFromCollectionIds?.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: collectionKeys.collection(id),
        });
      });

      // Track card save event in PostHog (only when adding to library)
      if (
        shouldCaptureAnalytics() &&
        analyticsContext &&
        variables.addToLibrary
      ) {
        const eventProperties: CardSaveEventProperties = {
          save_source: analyticsContext.saveSource,
          is_new_card: false,
          has_note: !!variables.note,
          collection_count: variables.addToCollectionIds?.length || 0,
          active_filters: analyticsContext.activeFilters
            ? {
                url_type: analyticsContext.activeFilters.urlType,
                sort: analyticsContext.activeFilters.sort,
                search_query: analyticsContext.activeFilters.searchQuery,
                profile_filter: analyticsContext.activeFilters.profileFilter,
              }
            : undefined,
          via_card_id: variables.viaCardId,
          page_path: analyticsContext.pagePath,
        };

        posthog.capture('card_saved', eventProperties);

        // Clear super properties after capture
        posthog.unregister('original_save_source');
        posthog.unregister('original_active_filters');
      }
    },
  });

  return mutation;
}
