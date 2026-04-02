'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(pathname);

  useEffect(() => {
    if (pathname !== currentPath) {
      setPreviousPath(currentPath);
      setCurrentPath(pathname);
    }
  }, [pathname, currentPath]);

  return (
    <NavHistoryContext.Provider
      value={{ previousPath, canGoBack: previousPath !== null }}
    >
      {props.children}
    </NavHistoryContext.Provider>
  );
}

export function useNavHistory() {
  const context = useContext(NavHistoryContext);

  if (!context) {
    throw new Error('useNavHistory must be used within a NavHistoryProvider');
  }

  return context;
}
