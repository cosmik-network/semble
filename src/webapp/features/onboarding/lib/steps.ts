export type StepId = 'about' | 'topics' | 'cards' | 'follow' | 'next';

// Order is meaningful: index + 1 is the ?step= value and the stepper position.
export const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: 'about', label: 'About you' },
  { id: 'topics', label: 'Topics' },
  { id: 'cards', label: 'Cards' },
  { id: 'follow', label: 'Follow' },
  { id: 'next', label: 'What next' },
];

export const TOTAL_STEPS = STEPS.length;

/**
 * Resolves ?step= to a renderable 1-based stage number. Pure range validation,
 * and deliberately nothing else.
 *
 * It does NOT gate stages 2 and 3 on having topics: progress is read from
 * localStorage after mount, so a topic-aware clamp would render stage 1 for one
 * frame on every deep-linked resume, then jump. Those stages handle empty
 * topics themselves.
 *
 * Never rewrites the URL, so it cannot fight the router by navigating during a
 * render.
 */
export function clampStep(raw: string | null): number {
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > TOTAL_STEPS) {
    return 1;
  }

  return parsed;
}
