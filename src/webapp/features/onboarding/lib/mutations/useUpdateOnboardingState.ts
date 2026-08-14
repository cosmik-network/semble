'use client';

import type {
  OnboardingState,
  UpdateOnboardingStateRequest,
} from '@semble/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOnboardingState } from '../dal';
import { onboardingKeys } from '../onboardingKeys';

export default function useUpdateOnboardingState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: UpdateOnboardingStateRequest) =>
      updateOnboardingState(update),

    onSuccess: (merged: OnboardingState) => {
      queryClient.setQueryData(onboardingKeys.state(), merged);
    },

    // No rollback on purpose: reverting a selection because a POST failed loses
    // real work to a network blip, where a stale row loses nothing the user can
    // see.
  });
}
