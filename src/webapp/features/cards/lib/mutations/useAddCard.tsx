import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addUrlToLibrary } from '../dal';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { noteKeys } from '@/features/notes/lib/noteKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';
import posthog from 'posthog-js';
import {
  CardSaveAnalyticsContext,
  CardSaveEventProperties,
} from '@/features/analytics/types';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';

export default function useAddCard(
  analyticsContext?: CardSaveAnalyticsContext,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newCard: {
      url: string;
      note?: string;
      collectionIds?: string[];
      viaCardId?: string;
    }) => {
      return addUrlToLibrary(newCard.url, {
        note: newCard.note,
        collectionIds: newCard.collectionIds,
        viaCardId: newCard.viaCardId,
      });
    },

    // Do things that are absolutely necessary and logic related (like query invalidation) in the useMutation callbacks
    // Do UI related things like redirects or showing toast notifications in mutate callbacks. If the user navigated away from the current screen before the mutation finished, those will purposefully not fire
    // https://tkdodo.eu/blog/mastering-mutations-in-react-query#some-callbacks-might-not-fire
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({
        queryKey: collectionKeys.bySembleUrl(variables.url),
      });

      // invalidate each collection query individually
      variables.collectionIds?.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: collectionKeys.collection(id),
        });
        queryClient.invalidateQueries({
          queryKey: collectionKeys.infinite(id),
        });
      });

      // Track card save event in PostHog
      if (shouldCaptureAnalytics() && analyticsContext) {
        const eventProperties: CardSaveEventProperties = {
          save_source: analyticsContext.saveSource,
          is_new_card: true,
          has_note: !!variables.note,
          collection_count: variables.collectionIds?.length || 0,
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
      }
    },
  });

  return mutation;
}
