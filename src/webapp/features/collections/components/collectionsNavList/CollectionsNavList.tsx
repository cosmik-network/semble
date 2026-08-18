'use client';

import { Group, Stack, Text } from '@mantine/core';
import { ErrorBoundary } from 'react-error-boundary';
import CreateCollectionShortcut from '../createCollectionShortcut/CreateCollectionShortcut';
import CollectionsNavListError from './Error.CollectionsNavList';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { useNavbarContext } from '@/providers/navbar';
import { LinkButton } from '@/components/link/MantineLink';
import CollectionsNavListContent from './CollectionsNavListContent';

export default function CollectionsNavList() {
  const { toggleMobile } = useNavbarContext();
  const { data: profile } = useMyProfile();

  return (
    <Stack gap={'xs'}>
      <Group justify="space-between">
        <Text fz={'sm'} fw={600} c={'gray'}>
          Collections
        </Text>

        <Group gap={'xs'}>
          <LinkButton
            href={`/profile/${profile.handle}/collections`}
            variant="light"
            radius={'xl'}
            size="xs"
            color="blue"
            onClick={toggleMobile}
          >
            View all
          </LinkButton>
          <CreateCollectionShortcut />
        </Group>
      </Group>

      <ErrorBoundary fallback={<CollectionsNavListError />}>
        <CollectionsNavListContent />
      </ErrorBoundary>
    </Stack>
  );
}
