'use client';

import { useLocalStorage, useMounted } from '@mantine/hooks';
import type { StepId } from './steps';

export interface OnboardingProgress {
  stepId: StepId;
  topics: string[];
  /** URLs fed to stage 4's recommendations — the selection, or the top 5. */
  seedUrls: string[];
  /** Option ids from the questionnaire — see lib/questions.ts. */
  intention: string[];
  /** Free text, only meaningful while `intention` contains OTHER_ID. */
  intentionOther: string;
  referralSource: string[];
  /** Free text, only meaningful while `referralSource` contains OTHER_ID. */
  referralSourceOther: string;
}

const STORAGE_KEY = 'semble.onboarding.progress';

// Hoisted on purpose: Mantine keeps defaultValue in a dependency array, so an
// inline literal would change identity on every render.
const EMPTY: OnboardingProgress = {
  stepId: 'about',
  topics: [],
  seedUrls: [],
  intention: [],
  intentionOther: '',
  referralSource: [],
  referralSourceOther: '',
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Mantine's default deserializer returns the raw string when JSON.parse throws,
 * so this validates field by field rather than trusting the shape.
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
    seedUrls: isStringArray(candidate.seedUrls) ? candidate.seedUrls : [],
    // Absent from records written before the questionnaire shipped, so these
    // take their defaults rather than needing a migration.
    intention: isStringArray(candidate.intention) ? candidate.intention : [],
    intentionOther: asString(candidate.intentionOther),
    referralSource: isStringArray(candidate.referralSource)
      ? candidate.referralSource
      : [],
    referralSourceOther: asString(candidate.referralSourceOther),
  };
}

export function useOnboardingProgress() {
  const [progress, setProgress, clear] = useLocalStorage<OnboardingProgress>({
    key: STORAGE_KEY,
    defaultValue: EMPTY,
    deserialize,
  });

  // useLocalStorage reads storage in an effect, so `progress` is EMPTY on the
  // server and on the first client render — a frame that means "we don't know
  // yet", not "the user has no topics". This call must stay after it: React
  // flushes effects in order, so isLoaded never turns true ahead of the value.
  const isLoaded = useMounted();

  const update = (patch: Partial<OnboardingProgress>) =>
    setProgress((current) => ({ ...current, ...patch }));

  return { progress, isLoaded, update, clear };
}
