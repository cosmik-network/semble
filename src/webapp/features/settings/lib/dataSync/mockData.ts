import type { DataSyncState } from './types';

export const MOCK_IN_SYNC: DataSyncState = {
  status: 'in-sync',
  drift: { pdsMissing: 0, dbMissing: 0 },
  lastSyncedAt: new Date('2026-05-19T08:42:00Z'),
  lastSyncAttemptAt: new Date('2026-05-19T08:42:00Z'),
  errorMessage: null,
  recordsProcessed: 0,
};

export const MOCK_PDS_AHEAD: DataSyncState = {
  status: 'out-of-sync',
  drift: { pdsMissing: 3, dbMissing: 0 },
  lastSyncedAt: new Date('2026-05-18T14:10:00Z'),
  lastSyncAttemptAt: new Date('2026-05-18T14:10:00Z'),
  errorMessage: null,
  recordsProcessed: 0,
};

export const MOCK_DB_AHEAD: DataSyncState = {
  status: 'out-of-sync',
  drift: { pdsMissing: 0, dbMissing: 2 },
  lastSyncedAt: new Date('2026-05-17T22:55:00Z'),
  lastSyncAttemptAt: new Date('2026-05-17T22:55:00Z'),
  errorMessage: null,
  recordsProcessed: 0,
};

export const MOCK_BOTH_DIRECTIONS: DataSyncState = {
  status: 'out-of-sync',
  drift: { pdsMissing: 3, dbMissing: 2 },
  lastSyncedAt: new Date('2026-05-16T09:30:00Z'),
  lastSyncAttemptAt: new Date('2026-05-16T09:30:00Z'),
  errorMessage: null,
  recordsProcessed: 0,
};

export const MOCK_SYNCING: DataSyncState = {
  status: 'syncing',
  drift: { pdsMissing: 3, dbMissing: 2 },
  lastSyncedAt: new Date('2026-05-16T09:30:00Z'),
  lastSyncAttemptAt: new Date('2026-05-19T10:00:00Z'),
  errorMessage: null,
  recordsProcessed: 14,
};

export const MOCK_FAILED: DataSyncState = {
  status: 'failed',
  drift: { pdsMissing: 3, dbMissing: 2 },
  lastSyncedAt: new Date('2026-05-16T09:30:00Z'),
  lastSyncAttemptAt: new Date('2026-05-19T09:58:00Z'),
  errorMessage: 'Could not reach your PDS at bsky.social',
  recordsProcessed: 0,
};
