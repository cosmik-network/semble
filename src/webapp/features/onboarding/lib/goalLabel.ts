export function goalLabel(picked: number, goal: number) {
  if (picked === 0) return `Pick at least ${goal} for the best suggestions`;
  if (picked >= goal) return 'Good to go — pick more if you like';

  return `${picked} of ${goal} picked`;
}
