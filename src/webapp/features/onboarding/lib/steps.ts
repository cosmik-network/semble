export type StepId = 'topics' | 'cards' | 'follow' | 'next';

// Order is meaningful: index + 1 is the ?step= value and the stepper position.
export const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: 'topics', label: 'Topics' },
  { id: 'cards', label: 'Save cards' },
  { id: 'follow', label: 'Follow people' },
  { id: 'next', label: 'What next' },
];

export const TOTAL_STEPS = STEPS.length;

/**
 * Resolves ?step= to a renderable 1-based stage number. Pure range validation,
 * and deliberately nothing else.
 *
 * It does NOT gate stages 2 and 3 on having topics. Progress is read from
 * localStorage just after mount, so a topic-aware clamp would render stage 1
 * for one frame on every deep-linked resume, then jump — a visible flicker on
 * the most common entry path. Stages 2 and 3 instead handle empty topics
 * themselves: their queries are already `enabled: queries.length > 0`, and
 * their empty states tell you to go back and add topics. Someone who asks for
 * stage 3 gets stage 3.
 *
 * Never rewrites the URL. Clamping only decides what renders, so it can't
 * fight the router by navigating during a render.
 */
export function clampStep(raw: string | null): number {
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > TOTAL_STEPS) {
    return 1;
  }

  return parsed;
}
