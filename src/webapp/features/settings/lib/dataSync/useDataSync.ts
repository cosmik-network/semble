'use client';

// Mock implementation backed by useState + setTimeout.
//
// To connect real data, replace this hook with TanStack Query:
//   - Status: useSuspenseQuery({ queryKey: dataSyncKeys.status(), queryFn: () => dal.getSyncStatus() })
//   - Resync: useMutation({ mutationFn: () => dal.resync(), onSuccess: () => queryClient.invalidateQueries(...) })
//
// The container's `initialState` prop can be dropped once real data is in place.

import { useCallback, useRef, useState } from 'react';
import type { DataSyncState } from './types';
import { MOCK_IN_SYNC } from './mockData';

export function useDataSync(initialState: DataSyncState = MOCK_IN_SYNC) {
  const [state, setState] = useState<DataSyncState>(initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resync = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const attemptedAt = new Date();
    setState((prev) => ({
      ...prev,
      status: 'syncing',
      lastSyncAttemptAt: attemptedAt,
      errorMessage: null,
      recordsProcessed: 0,
    }));

    timerRef.current = setTimeout(() => {
      setState({
        status: 'in-sync',
        drift: { pdsMissing: 0, dbMissing: 0 },
        lastSyncedAt: new Date(),
        lastSyncAttemptAt: new Date(),
        errorMessage: null,
        recordsProcessed: 0,
      });
    }, 1000);
  }, []);

  return { ...state, resync };
}
