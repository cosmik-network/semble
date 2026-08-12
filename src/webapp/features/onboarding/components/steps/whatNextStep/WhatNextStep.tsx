'use client';

import { Fragment, Suspense, useState } from 'react';
import { Box, Center, Loader, SimpleGrid, Stack, Title } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { BiCollection } from 'react-icons/bi';
import { FiBookOpen, FiCompass, FiHome, FiPlus } from 'react-icons/fi';
import { TbPlugConnected } from 'react-icons/tb';
import Composer from '@/features/composer/components/Composer';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import useMyProfileStats from '@/features/profile/lib/queries/useMyProfileStats';
import { useAuth } from '@/hooks/useAuth';
import WhatNextTile from '../../whatNextTile/WhatNextTile';
import ConnectTileCards from '../../connectTileCards/ConnectTileCards';
import SaveTileCards from '../../saveTileCards/SaveTileCards';
import InstallOptions from '../../installOptions/InstallOptions';
import OptionTile, { iconMark } from '../../optionTile/OptionTile';
import StepHeading from '../../stepHeading/StepHeading';

const DOCS_URL = 'https://docs.cosmik.network/semble';

interface Props {
  variant: 'flow' | 'returning';
  onComplete: () => void;
}

export default function WhatNextStep(props: Props) {
  const stats = useMyProfileStats();
  const { user } = useAuth();

  const [composerOpen, composer] = useDisclosure(false);
  const [collectionOpen, collectionDrawer] = useDisclosure(false);

  const [openPanel, setOpenPanel] = useState<'save' | 'connect' | null>(null);

  const togglePanel = (panel: 'save' | 'connect') =>
    setOpenPanel((current) => (current === panel ? null : panel));

  // A full-width panel can only be inserted at a row boundary, so the column
  // count has to be known. The queries are SimpleGrid's own breakpoints below;
  // `false` is the SSR value, and no panel is open on first paint.
  const twoUp = useMediaQuery('(min-width: 36em)', false);
  const threeUp = useMediaQuery('(min-width: 48em)', false);
  const columns = threeUp ? 3 : twoUp ? 2 : 1;

  // A one-way latch: the drawer reports the creation, but the stats query
  // behind it will not have refetched yet.
  const [createdCollection, setCreatedCollection] = useState(false);

  // Never synthesized: on a failed stats query these are 0, so the checklist
  // stays actionable rather than claiming credit it cannot verify.
  const cardCount = stats.data?.urlCardCount ?? 0;
  const collectionCount = stats.data?.collectionCount ?? 0;
  const connectionCount = stats.data?.connectionCount ?? 0;

  if (stats.isPending) {
    return (
      <Center py={'xl'}>
        <Loader />
      </Center>
    );
  }

  const tasks = [
    {
      key: 'save',
      icon: <FiPlus />,
      color: 'tangerine',
      title: 'Save a card',
      description: 'Start your library with one of these',
      done: cardCount > 0,
      onClick: () => togglePanel('save'),
      expanded: openPanel === 'save',
    },
    {
      key: 'collection',
      icon: <BiCollection />,
      color: 'grape',
      title: 'Create a collection',
      description: 'Keep related cards together',
      done: createdCollection || collectionCount > 0,
      onClick: collectionDrawer.open,
      expanded: undefined,
    },
    {
      key: 'connect',
      icon: <TbPlugConnected />,
      color: 'green',
      title: 'Connect two cards',
      description: 'Show how two ideas relate',
      done: connectionCount > 0,
      onClick: () => togglePanel('connect'),
      expanded: openPanel === 'connect',
    },
  ];

  const sectionHeading = (label: string) => (
    <Title order={2} fz={'xl'} fw={600}>
      {label}
    </Title>
  );

  const openIndex = tasks.findIndex((task) => task.key === openPanel);
  const panelAfter =
    openIndex < 0
      ? -1
      : Math.min(
          (Math.floor(openIndex / columns) + 1) * columns - 1,
          tasks.length - 1,
        );

  const panel =
    openPanel === 'save' ? (
      <SaveTileCards onSaveOwnLink={composer.open} />
    ) : openPanel === 'connect' && user?.handle ? (
      <ConnectTileCards handle={user.handle} />
    ) : null;

  return (
    <Stack gap={'xl'}>
      <StepHeading
        title={props.variant === 'returning' ? 'What next?' : "You're all set"}
        description="Try something below, or take Semble with you."
      />

      <Stack gap={'sm'}>
        {sectionHeading('Try something')}

        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'xs'}>
          {tasks.map((task, index) => (
            <Fragment key={task.key}>
              <WhatNextTile
                icon={task.icon}
                color={task.color}
                title={task.title}
                description={task.description}
                done={task.done}
                onClick={task.onClick}
                expanded={task.expanded}
              />

              {index === panelAfter && panel && (
                <Box style={{ gridColumn: '1 / -1', minWidth: 0 }}>{panel}</Box>
              )}
            </Fragment>
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap={'sm'}>
        {sectionHeading('Take Semble with you')}
        <InstallOptions onSelect={props.onComplete} />
      </Stack>

      <Stack gap={'sm'}>
        {sectionHeading('Where to next')}

        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'xs'}>
          <OptionTile
            href="/home"
            mark={iconMark(<FiHome />)}
            title="Home"
            description="Your library and your feed"
            onClick={props.onComplete}
          />
          <OptionTile
            href="/explore"
            mark={iconMark(<FiCompass />)}
            title="Explore"
            description="See what others are saving"
            onClick={props.onComplete}
          />
          <OptionTile
            href={DOCS_URL}
            external
            mark={iconMark(<FiBookOpen />)}
            title="Docs"
            description="How Semble works"
          />
        </SimpleGrid>
      </Stack>

      {/* Composer is the drawer itself — ComposerDrawer is the global FAB
          wrapper and must not be used here.

          The boundary is defence in depth: Composer runs useMyCollections at
          the top of its body rather than inside its Drawer, so it suspends even
          while closed. Without a local boundary any un-prefetched suspense
          query in this subtree would blank the whole screen. */}
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
