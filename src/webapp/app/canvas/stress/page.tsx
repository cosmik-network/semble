import { notFound } from 'next/navigation';
import StressBoard from '@/features/canvas/stress/StressBoard';

// A 500-card, 2,000-arrow board on an in-memory server, for checking pan and
// zoom by hand (#980)
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();

  return <StressBoard />;
}
