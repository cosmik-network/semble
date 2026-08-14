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
 * Range validation and nothing else: later stages are not gated on earlier
 * answers — they handle an empty record themselves — and the URL is never
 * rewritten, so this cannot navigate during a render.
 */
export function clampStep(raw: string | null): number {
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > TOTAL_STEPS) {
    return 1;
  }

  return parsed;
}
