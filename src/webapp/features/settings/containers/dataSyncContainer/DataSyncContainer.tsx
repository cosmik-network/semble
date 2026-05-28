'use client';

import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Progress,
  Stack,
  Text,
} from '@mantine/core';
import { getRelativeTime } from '@/lib/utils/time';
import { useDataSync } from '../../lib/dataSync/useDataSync';
import type { DataSyncState } from '../../lib/dataSync/types';

interface DataSyncContainerProps {
  /**
   * Seed the sync state. Defaults to the in-sync mock.
   * Remove this prop when wiring up real data via the hook.
   * (used by Storybook)
   */
  initialState?: DataSyncState;
}

function formatRelative(date: Date | null): string {
  if (!date) return 'never';
  const relative = getRelativeTime(date.toISOString());
  return relative === 'now' ? 'just now' : `${relative} ago`;
}

export default function DataSyncContainer({
  initialState,
}: DataSyncContainerProps) {
  const {
    status,
    drift,
    lastSyncedAt,
    lastSyncAttemptAt,
    errorMessage,
    recordsProcessed,
    resync,
  } = useDataSync(initialState);

  const isSyncing = status === 'syncing';
  const buttonLabel = status === 'failed' ? 'Retry' : 'Re-sync now';

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={0}>
            <Text fw={500}>Data sync</Text>
            <Text fw={500} c="gray" fz="sm">
              Reconcile records between Semble and your PDS
            </Text>
          </Stack>
          <Button
            variant="light"
            size="sm"
            radius="xl"
            onClick={resync}
            loading={isSyncing}
            style={{ flexShrink: 0 }}
          >
            {buttonLabel}
          </Button>
        </Group>

        <Card bg="var(--mantine-color-gray-light)" radius="lg" p="md">
          <Stack gap="sm">
            {status === 'in-sync' && (
              <>
                <Badge color="green" size="sm" w="fit-content">
                  In sync
                </Badge>
                <Text fz="sm" fw={500} c="gray">
                  Everything matches between Semble and your PDS.
                </Text>
                <Text fz="xs" fw={500} c="dimmed">
                  Last synced {formatRelative(lastSyncedAt)}
                </Text>
              </>
            )}

            {status === 'out-of-sync' && (
              <>
                <Badge color="orange" size="sm" w="fit-content">
                  Out of sync
                </Badge>
                <Stack gap={4}>
                  {drift.pdsMissing > 0 && (
                    <Text fz="sm" fw={500} c="bright">
                      {drift.pdsMissing}{' '}
                      {drift.pdsMissing === 1 ? 'record' : 'records'} in your
                      PDS not yet in Semble
                    </Text>
                  )}
                  {drift.dbMissing > 0 && (
                    <Text fz="sm" fw={500} c="bright">
                      {drift.dbMissing}{' '}
                      {drift.dbMissing === 1 ? 'record' : 'records'} in Semble
                      not yet on your PDS
                    </Text>
                  )}
                </Stack>
                <Text fz="xs" fw={500} c="dimmed">
                  Last synced {formatRelative(lastSyncedAt)}
                </Text>
              </>
            )}

            {status === 'syncing' && (
              <>
                <Badge color="blue" size="sm" w="fit-content">
                  Syncing
                </Badge>
                <Text fz="sm" fw={500} c="gray">
                  {recordsProcessed}{' '}
                  {recordsProcessed === 1 ? 'record' : 'records'} processed
                </Text>
                <Progress value={100} animated size="md" radius="xl" />
              </>
            )}

            {status === 'failed' && (
              <>
                <Badge color="red" size="sm" w="fit-content">
                  Failed
                </Badge>
                {errorMessage && (
                  <Text fz="sm" fw={500} c="bright">
                    {errorMessage}
                  </Text>
                )}
                <Text fz="xs" fw={500} c="dimmed">
                  Last attempted {formatRelative(lastSyncAttemptAt)}
                </Text>
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
