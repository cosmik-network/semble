import { CollectionAccessType } from '@semble/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCollection } from '../dal';
import { collectionKeys } from '../collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { tagKeys } from '@/features/tags/lib/tagKeys';
import {
  CardSaveAnalyticsContext,
  CardSaveSource,
} from '@/features/analytics/types';
import useOnboardingMilestones from '@/features/onboarding/lib/useOnboardingMilestones';

export default function useCreateCollection(
  analyticsContext?: CardSaveAnalyticsContext,
) {
  const queryClient = useQueryClient();
  const onboarding = useOnboardingMilestones();

  const mutation = useMutation({
    mutationFn: (newCollection: {
      name: string;
      description: string;
      accessType: CollectionAccessType;
    }) => {
      return createCollection(newCollection);
    },

    // Do things that are absolutely necessary and logic related (like query invalidation) in the useMutation callbacks
    // Do UI related things like redirects or showing toast notifications in mutate callbacks. If the user navigated away from the current screen before the mutation finished, those will purposefully not fire
    // https://tkdodo.eu/blog/mastering-mutations-in-react-query#some-callbacks-might-not-fire
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
      queryClient.invalidateQueries({ queryKey: tagKeys.all() });
      queryClient.refetchQueries({ queryKey: collectionKeys.mine() });

      // Recorded from the id the server returned, not from the drawer's
      // onCreate: that callback only fires if the new collection can be found
      // in the refetched list cache, so a collection created during onboarding
      // could go unrecorded despite being created.
      if (
        data?.collectionId &&
        analyticsContext?.saveSource === CardSaveSource.ONBOARDING
      ) {
        onboarding.recordCollectionCreated(data.collectionId);
      }
    },
  });

  return mutation;
}
