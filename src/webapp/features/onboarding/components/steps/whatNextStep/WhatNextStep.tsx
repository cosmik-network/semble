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

  // Honest count — never synthesized. Each tile below accounts for
  // stats.isError itself, so a broken stats query can't silently pose as
  // "this user has 2 cards" for one decision while meaning "0" for another.
  const cardCount = stats.data?.urlCardCount ?? 0;

  // Latch the save tile's visibility on the first render that has real data
  // (success or error). This is React's "adjust state while rendering"
  // pattern — the condition makes it run at most once, so it cannot loop.
  // On error we can't know the real count, so we fail open: seed the latch
  // to visible rather than hidden. A dimmed door with no explanation is
  // worse than the tile just being there.
  const [showSaveTile, setShowSaveTile] = useState<boolean | null>(null);
  if (showSaveTile === null && !stats.isPending) {
    setShowSaveTile(stats.isError || cardCount === 0);
  }

  // Same fail-open reasoning for the connect tile: an error unlocks it
  // outright rather than leaving it dimmed behind a hint that may be wrong.
  const canConnect = stats.isError || cardCount >= 2;

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
              expanded={canConnect && connectExpanded}
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
          wrapper and must not be used here.

          The boundary is defence in depth. Composer runs useMyCollections —
          a suspense query — at the top of its body, not inside its Drawer, so
          it suspends even while closed. app/onboarding/page.tsx prefetches
          that key, but without a local boundary any future un-prefetched
          suspense query in this subtree would suspend to the page-level
          boundary and blank the entire screen. Degrade to a missing drawer
          instead. */}
      <Suspense fallback={null}>
        <Composer
          isOpen={composerOpen}
          onClose={composer.close}
          initialMode="card"
        />
      </Suspense>

      <CreateCollectionDrawer
        isOpen={collectionOpen}
        onClose={collectionDrawer.close}
        onCreate={() => setCreatedCollection(true)}
      />
    </Stack>
  );
}
