'use client';

import type {
  OnboardingState,
  UpdateOnboardingStateRequest,
} from '@semble/types';
import { useQueryClient } from '@tanstack/react-query';
import { updateOnboardingState } from './dal';
import { onboardingKeys } from './onboardingKeys';

export type InstallMilestoneField =
  | 'pwaClicked'
  | 'iosShortcutClicked'
  | 'browserExtensionClicked'
  | 'mcpClicked';

/**
 * Records what a user does *during* onboarding, from the shared components that
 * do it, each gated on a save source of ONBOARDING.
 *
 * Holds no query and no mutation on purpose: its callers mount once per card in
 * every list in the app, so a useMutation here would put an observer on every
 * card on the page to buy retries nothing reads.
 */
export default function useOnboardingMilestones() {
  const queryClient = useQueryClient();

  const record = (
    build: (
      current: OnboardingState | undefined,
    ) => UpdateOnboardingStateRequest | null,
  ) => {
    const current = queryClient.getQueryData<OnboardingState>(
      onboardingKeys.state(),
    );

    const patch = build(current);
    if (!patch || Object.keys(patch).length === 0) return;

    if (current) {
      queryClient.setQueryData(onboardingKeys.state(), {
        ...current,
        ...patch,
      });
    }

    // Fire and forget: a milestone that fails to land must not surface as an
    // error over a drawer the user has finished with.
    void updateOnboardingState(patch).catch(() => {});
  };

  return {
    recordCardSaved: (url: string) =>
      record((current) => {
        const saved = current?.firstCards ?? [];
        if (saved.includes(url)) return null;

        return { firstCards: [...saved, url] };
      }),

    /** First wins: these columns hold one value, not the latest one. */
    recordCollectionCreated: (collectionId: string) =>
      record((current) =>
        current?.firstCollection ? null : { firstCollection: collectionId },
      ),

    recordConnectionCreated: (connectionId: string) =>
      record((current) => ({
        ...(current?.firstConnection ? {} : { firstConnection: connectionId }),
        ...(current?.connectionCreationModalCompleted
          ? {}
          : { connectionCreationModalCompleted: new Date() }),
      })),

    recordSaveGuideCompleted: () =>
      record((current) =>
        current?.saveModalGuideCompleted
          ? null
          : { saveModalGuideCompleted: new Date() },
      ),

    recordInstallClicked: (field: InstallMilestoneField) =>
      record(() => ({ [field]: new Date() })),
  };
}
