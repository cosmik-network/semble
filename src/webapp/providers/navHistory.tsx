'use client';

import React, { createContext, use, useState } from 'react';
import { usePathname } from 'next/navigation';

interface NavHistoryContext {
  previousPath: string | null;
  canGoBack: boolean;
}

const NavHistoryContext = createContext<NavHistoryContext>({
  previousPath: null,
  canGoBack: false,
});

interface Props {
  children: React.ReactNode;
}

export function NavHistoryProvider(props: Props) {
  const pathname = usePathname();
  const [paths, setPaths] = useState<{
    current: string;
    previous: string | null;
  }>({ current: pathname, previous: null });

  // Track the previous path by adjusting state during render
  // (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  if (pathname !== paths.current) {
    setPaths({ current: pathname, previous: paths.current });
  }

  const previousPath = paths.previous;

  return (
    <NavHistoryContext
      value={{ previousPath, canGoBack: previousPath !== null }}
    >
      {props.children}
    </NavHistoryContext>
  );
}

export function useNavHistory() {
  const context = use(NavHistoryContext);

  if (!context) {
    throw new Error('useNavHistory must be used within a NavHistoryProvider');
  }

  return context;
}
