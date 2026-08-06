'use client';

import { useLocalStorage, useMounted } from '@mantine/hooks';
import type { StepId } from './steps';

export interface OnboardingProgress {
  stepId: StepId;
  topics: string[];
  /** URLs actually saved as cards. */
  savedUrls: string[];
  /** URLs fed to stage 3's recommendations — the selection, or the top 5. */
  seedUrls: string[];
}

const STORAGE_KEY = 'semble.onboarding.progress';

// Hoisted on purpose: Mantine keeps defaultValue in a dependency array, so an
// inline literal would change identity on every render.
const EMPTY: OnboardingProgress = {
  stepId: 'topics',
  topics: [],
  savedUrls: [],
  seedUrls: [],
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Mantine's default deserializer returns the raw string when JSON.parse
 * throws, so this must validate the shape rather than trust it. Field by
 * field: a half-written or hand-edited record must not put undefined into
 * topics and blow up .length downstream.
 */
function deserialize(raw: string | undefined): OnboardingProgress {
  if (!raw) return EMPTY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }

  if (typeof parsed !== 'object' || parsed === null) return EMPTY;

  const candidate = parsed as Partial<OnboardingProgress>;

  return {
    stepId:
      typeof candidate.stepId === 'string'
        ? (candidate.stepId as StepId)
        : EMPTY.stepId,
    topics: isStringArray(candidate.topics) ? candidate.topics : [],
    savedUrls: isStringArray(candidate.savedUrls) ? candidate.savedUrls : [],
    seedUrls: isStringArray(candidate.seedUrls) ? candidate.seedUrls : [],
  };
}

export function useOnboardingProgress() {
  const [progress, setProgress, clear] = useLocalStorage<OnboardingProgress>({
    key: STORAGE_KEY,
    defaultValue: EMPTY,
    deserialize,
  });

  // useLocalStorage reads storage in an effect, so `progress` is EMPTY on the
  // server and on the first client render. Callers must not read that frame as
  // "the user has no topics" — it means "we don't know yet", and treating the
  // two the same flashes an empty state before the real loading state.
  //
  // Order matters: this call sits after useLocalStorage, so its effect is
  // registered after the storage read. React flushes them in order and batches
  // the resulting updates into one render, so isLoaded never turns true ahead
  // of the stored value.
  const isLoaded = useMounted();

  const update = (patch: Partial<OnboardingProgress>) =>
    setProgress((current) => ({ ...current, ...patch }));

  return { progress, isLoaded, update, clear };
}
