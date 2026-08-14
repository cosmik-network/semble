import type { OnboardingState } from '@semble/types';

/**
 * Derived rather than stored: there is no column for the current step, so each
 * stage's field doubles as the marker that it was finished. `null` means "never
 * got here", `[]` means "got here and skipped it", so every Continue and Skip
 * has to write its field, empty array included.
 *
 * Assignments ascend rather than returning early, so a column cleared by "Start
 * over" cannot strand the user behind a later one that is still set.
 *
 * Analytics reads these columns with `cardinality(col) > 0`, where `null` and
 * `[]` are equivalent. That answers a different question — do not collapse the
 * two readings into one.
 */
export function resumeStep(state: OnboardingState | null | undefined): number {
  if (!state) return 1;

  let step = 1;
  if (state.intention != null || state.referralSource != null) step = 2;
  if (state.topicsSelected != null) step = 3;
  if (state.linksSelected != null) step = 4;
  if (state.followedAccounts != null || state.followedCollections != null) {
    step = 5;
  }

  return step;
}
