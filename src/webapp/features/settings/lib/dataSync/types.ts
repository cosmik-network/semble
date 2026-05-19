export type DataSyncStatus =
  | 'in-sync'
  | 'out-of-sync'
  | 'syncing'
  | 'failed';

export interface DataSyncDrift {
  /** Records in the user's PDS that are not in the Semble DB. */
  pdsMissing: number;
  /** Records in the Semble DB that are not yet on the user's PDS. */
  dbMissing: number;
}

export interface DataSyncState {
  status: DataSyncStatus;
  drift: DataSyncDrift;
  lastSyncedAt: Date | null;
  lastSyncAttemptAt: Date | null;
  errorMessage: string | null;
  recordsProcessed: number;
}
