'use client';

import { createContext, use, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface SembleNavigation {
  navigate: (href: string) => void;
  isNavigating: boolean;
}

const SembleNavigationContext = createContext<SembleNavigation | null>(null);

// Next holds navigation between semble pages until the next page's
// generateMetadata resolves, so loading.tsx never shows. Navigating in our own
// transition lets the page show its skeleton in the meantime.
export function SembleNavigationProvider(props: { children: ReactNode }) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.push(href));

  return (
    <SembleNavigationContext value={{ navigate, isNavigating }}>
      {props.children}
    </SembleNavigationContext>
  );
}

// Null outside semble pages
export const useSembleNavigation = () => use(SembleNavigationContext);
