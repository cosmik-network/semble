'use client';

import { useRef } from 'react';
import type {
  OnboardingState,
  OnboardingStatus,
  UpdateOnboardingStateRequest,
} from '@semble/types';
import { useDebouncedCallback } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { onboardingKeys } from './onboardingKeys';
import useOnboardingStateQuery from './queries/useOnboardingStateQuery';
import useUpdateOnboardingState from './mutations/useUpdateOnboardingState';

const EMPTY: OnboardingState = {
  userId: '',
  updatedAt: new Date(0),
};

const WRITE_DELAY = 500;

type Patch =
  | UpdateOnboardingStateRequest
  | ((current: OnboardingState) => UpdateOnboardingStateRequest);

/**
 * The one place onboarding state is read and written.
 *
 * Writing is split in two: `stage` echoes a choice into the cache without
 * persisting, `update` and `updateNow` persist. Committing a stage's answer
 * once, on its Continue or Skip, is what lets a non-null column mean "finished
 * this step" and keeps the derived resume point honest.
 */
export default function useOnboardingState() {
  const queryClient = useQueryClient();
  const query = useOnboardingStateQuery();
  const mutation = useUpdateOnboardingState();

  const pending = useRef<UpdateOnboardingStateRequest>({});

  const send = useDebouncedCallback(
    () => {
      const patch = pending.current;
      pending.current = {};

      if (Object.keys(patch).length > 0) {
        mutation.mutate(patch);
      }
    },
    // flushOnUnmount so leaving the flow persists the last edit, and Mantine
    // owns that effect rather than this feature.
    { delay: WRITE_DELAY, flushOnUnmount: true },
  );

  /**
   * Cache only — no request. The function form is for fields that accumulate:
   * two follows resolving in the same tick would otherwise both read the record
   * from their own render.
   */
  const stage = (patch: Patch) => {
    let resolved: UpdateOnboardingStateRequest = {};

    queryClient.setQueryData(
      onboardingKeys.state(),
      (current: OnboardingState | undefined) => {
        const base = current ?? EMPTY;
        resolved = typeof patch === 'function' ? patch(base) : patch;

        return { ...base, ...resolved };
      },
    );

    return resolved;
  };

  // Successive patches merge into one request; the endpoint only touches the
  // keys it is sent.
  const queue = (patch: Patch) => {
    pending.current = { ...pending.current, ...stage(patch) };
  };

  /** Debounced. For an action that has already happened elsewhere. */
  const update = (patch: Patch) => {
    queue(patch);
    send();
  };

  /**
   * Immediate, for writes that coincide with leaving the page. `flush` is a
   * no-op until a call has armed it, hence the `send()` before it.
   */
  const updateNow = (patch: Patch) => {
    queue(patch);
    send();
    send.flush();
  };

  const state = query.data ?? EMPTY;

  return {
    state,
    status: (state.onboardingState ?? 'NOT_STARTED') as OnboardingStatus,
    // Tells "no answer yet" apart from "we don't know yet". False only while
    // the first read is in flight, which a server-seeded cache skips.
    isLoaded: !query.isPending,
    stage,
    update,
    updateNow,
  };
}
