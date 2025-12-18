'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { Stack, Button, Text, SimpleGrid, Group, Title } from '@mantine/core';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { BiCollection } from 'react-icons/bi';
import { FiPlus } from 'react-icons/fi';

export default function RecentCollections() {
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);
  const { data: profile } = useMyProfile();
  const { data: collectionsData } = useMyCollections({ limit: 4 });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <BiCollection size={22} />
          <Title order={2}>Collections</Title>
        </Group>
        <Button
          variant="light"
          component={Link}
          color="blue"
          href={`/profile/${profile.handle}/collections`}
        >
          View all
        </Button>
      </Group>

      {collections.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </SimpleGrid>
      ) : (
        <Fragment>
          <Stack align="center" gap="xs">
            <Text fz="h3" fw={600} c="gray">
              No collections
            </Text>
            <Button
              onClick={() => setShowCollectionDrawer(true)}
              variant="light"
              color="gray"
              size="md"
              rightSection={<FiPlus size={22} />}
            >
              Create your first collection
            </Button>
          </Stack>

          <CreateCollectionDrawer
            isOpen={showCollectionDrawer}
            onClose={() => setShowCollectionDrawer(false)}
          />
        </Fragment>
      )}
    </Stack>
  );
}
