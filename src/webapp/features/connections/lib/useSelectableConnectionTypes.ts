'use client';

import { useMemo } from 'react';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import {
  CONNECTION_TYPES,
  ConnectionTypeConfig,
} from '../const/connectionTypes';

/**
 * The connection types a curator is allowed to *pick* right now.
 *
 * Types marked `isNew` stay hidden until the `newConnectionTypes` flag is on.
 * This is deliberately only about selection: rendering an existing connection
 * must always look up against the full CONNECTION_TYPES list, otherwise a
 * connection created by a flagged-in user would render as an unlabeled blank
 * for everyone else.
 */
export function useSelectableConnectionTypes(): readonly ConnectionTypeConfig[] {
  const { data: featureFlags } = useFeatureFlags();
  const showNew = featureFlags?.newConnectionTypes ?? false;

  return useMemo(
    () =>
      showNew ? CONNECTION_TYPES : CONNECTION_TYPES.filter((t) => !t.isNew),
    [showNew],
  );
}
