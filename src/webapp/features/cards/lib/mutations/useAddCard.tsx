import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addUrlToLibrary } from '../dal';
import { cardKeys } from '../cardKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { noteKeys } from '@/features/notes/lib/noteKeys';
import { sembleKeys } from '@/features/semble/lib/sembleKeys';
import { connectionKeys } from '@/features/connections/lib/connectionKeys';
import posthog from 'posthog-js';
import {
  CardSaveAnalyticsContext,
  CardSaveEventProperties,
} from '@/features/analytics/types';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { notifications } from '@mantine/notifications';
import { BsCheck, BsExclamation } from 'react-icons/bs';

export default function useAddCard(
  analyticsContext?: CardSaveAnalyticsContext,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newCard: {
      url: string;
      note?: string;
      collectionIds?: string[];
      viaCardId?: string;
      notificationId?: string;
    }) => {
      return addUrlToLibrary(newCard.url, {
        note: newCard.note,
        collectionIds: newCard.collectionIds,
        viaCardId: newCard.viaCardId,
      });
    },

    // Generally, do UI things (redirects, toasts) in mutate-level callbacks so they
    // don't fire if the user navigated away. But loading toasts that need .update()
    // must be handled here — Suspense re-renders can unmount the caller and drop
    // mutate-level callbacks, leaving the loading toast stuck forever.
    // https://tkdodo.eu/blog/mastering-mutations-in-react-query#some-callbacks-might-not-fire
    onSuccess: (_data, variables) => {
      if (variables.notificationId) {
        notifications.update({
          id: variables.notificationId,
          color: 'green',
          title: 'Success!',
          message: 'Card added',
          position: 'top-center',
          loading: false,
          autoClose: 2000,
          icon: <BsCheck />,
        });
      }

      queryClient.invalidateQueries({ queryKey: cardKeys.all() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: sembleKeys.all() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.mine() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() });
      queryClient.invalidateQueries({
        queryKey: collectionKeys.bySembleUrl(variables.url),
      });
      // Invalidate URL metadata with stats to update tab counts
      queryClient.invalidateQueries({
        queryKey: cardKeys.urlMetadata(variables.url, { includeStats: true }),
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

        // Clear super properties after capture
        posthog.unregister('original_save_source');
        posthog.unregister('original_active_filters');
      }
    },

    onError: (_error, variables) => {
      if (variables.notificationId) {
        notifications.update({
          id: variables.notificationId,
          color: 'red',
          title: 'Error',
          message: 'Could not add card',
          position: 'top-center',
          loading: false,
          autoClose: 5000,
          withCloseButton: true,
          icon: <BsExclamation />,
        });
      }
    },
  });

  return mutation;
}
