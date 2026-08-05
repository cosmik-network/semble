'use client';

import { Suspense, useState } from 'react';
import { Center, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FiBookmark, FiPlus } from 'react-icons/fi';
import { TbPlugConnected } from 'react-icons/tb';
import { LinkButton } from '@/components/link/MantineLink';
import Composer from '@/features/composer/components/Composer';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import useMyProfileStats from '@/features/profile/lib/queries/useMyProfileStats';
import { useAuth } from '@/hooks/useAuth';
import WhatNextTile from '../../whatNextTile/WhatNextTile';
import ConnectTileCards from '../../connectTileCards/ConnectTileCards';

interface Props {
  variant: 'flow' | 'returning';
  /** Writes status 'completed' before the browser follows an exit link. */
  onComplete: () => void;
}

export default function WhatNextStep(props: Props) {
  const stats = useMyProfileStats();
  const { user } = useAuth();

  const [composerOpen, composer] = useDisclosure(false);
  const [collectionOpen, collectionDrawer] = useDisclosure(false);
  const [connectExpanded, connectTile] = useDisclosure(false);

  // Plain useState, not useDisclosure: this is a one-way latch, and calling
  // it `open()` would misdescribe what happened.
  const [createdCollection, setCreatedCollection] = useState(false);

  // Stage 4 fails open: if stats can't load, unlock everything rather than
  // show a screen of locked doors.
  const cardCount = stats.isError ? 2 : (stats.data?.urlCardCount ?? 0);

  // Latch the save tile's visibility on the first render that has real data.
  // This is React's "adjust state while rendering" pattern — the condition
  // makes it run at most once, so it cannot loop.
  const [showSaveTile, setShowSaveTile] = useState<boolean | null>(null);
  if (showSaveTile === null && !stats.isPending) {
    setShowSaveTile(cardCount === 0);
  }

  const canConnect = cardCount >= 2;

  if (stats.isPending) {
    return (
      <Center py={'xl'}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap={'lg'}>
      <Stack gap={4}>
        <Title order={1}>
          {props.variant === 'returning' ? 'What next?' : "You're set up."}
        </Title>
        <Text c={'dimmed'}>
          Each of these takes a few seconds, and you stay on this page.
        </Text>
      </Stack>

      <Stack gap={'xs'}>
        <Text fz={'xs'} fw={700} c={'dimmed'} tt={'uppercase'}>
          Try something
        </Text>

        <Grid>
          {showSaveTile && (
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <WhatNextTile
                icon={<FiBookmark />}
                title="Save a card"
                description="Any link worth keeping."
                done={cardCount > 0}
                onClick={composer.open}
              />
            </Grid.Col>
          )}

          <Grid.Col span={{ base: 12, sm: 4 }}>
            <WhatNextTile
              icon={<FiPlus />}
              title="Create a collection"
              description="Group cards by theme."
              done={createdCollection}
              onClick={collectionDrawer.open}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 4 }}>
            <WhatNextTile
              icon={<TbPlugConnected />}
              title="Connect two cards"
              description="Say why two cards belong together."
              locked={!canConnect}
              lockedHint="Save 2 cards to connect them."
              onClick={connectTile.toggle}
            >
              {canConnect && connectExpanded && user?.handle && (
                <Suspense
                  fallback={
                    <Center py={'md'}>
                      <Loader size={'sm'} />
                    </Center>
                  }
                >
                  <ConnectTileCards handle={user.handle} />
                </Suspense>
              )}
            </WhatNextTile>
          </Grid.Col>
        </Grid>
      </Stack>

      <Stack gap={'xs'}>
        <Text fz={'xs'} fw={700} c={'dimmed'} tt={'uppercase'}>
          Or go somewhere
        </Text>
        <Group gap={'xs'}>
          <LinkButton
            href="/explore"
            variant="default"
            radius={'xl'}
            onClick={props.onComplete}
          >
            Explore Semble
          </LinkButton>
          <LinkButton
            href="/install-app"
            variant="default"
            radius={'xl'}
            onClick={props.onComplete}
          >
            Install Semble
          </LinkButton>
          <LinkButton
            href="/home"
            variant="default"
            radius={'xl'}
            onClick={props.onComplete}
          >
            Go home
          </LinkButton>
        </Group>
      </Stack>

      {/* Composer is the drawer itself. ComposerDrawer is the global FAB
          wrapper and must not be used here. */}
      <Composer
        isOpen={composerOpen}
        onClose={composer.close}
        initialMode="card"
      />

      <CreateCollectionDrawer
        isOpen={collectionOpen}
        onClose={collectionDrawer.close}
        onCreate={() => setCreatedCollection(true)}
      />
    </Stack>
  );
}
