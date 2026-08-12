export type OnboardingStatus =
  | 'unseen'
  | 'in_progress'
  | 'completed'
  | 'dismissed';

export const ONBOARDING_STATUS_COOKIE = 'semble_onboarding_status';

const STORED_VALUES: OnboardingStatus[] = [
  'in_progress',
  'completed',
  'dismissed',
];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Pure — safe to call from a Server Component with the value from cookies().
 * 'unseen' is the absence of the cookie, never a stored value; anything
 * unrecognised also reads as 'unseen'.
 */
export function parseOnboardingStatus(
  raw: string | undefined,
): OnboardingStatus {
  return STORED_VALUES.includes(raw as OnboardingStatus)
    ? (raw as OnboardingStatus)
    : 'unseen';
}

/**
 * Browser only. Not httpOnly on purpose — the client writes it directly, and
 * it is not a secret. SameSite=Lax so it survives normal navigation.
 */
export function writeOnboardingStatus(status: OnboardingStatus): void {
  if (typeof document === 'undefined') return;

  const maxAge = status === 'unseen' ? 0 : ONE_YEAR_SECONDS;

  // Applied only on https: browsers reject Secure cookies on http:// dev hosts
  // that aren't localhost.
  const secure = document.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${ONBOARDING_STATUS_COOKIE}=${status}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}
