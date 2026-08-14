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
import { CardSaveSource } from '@/features/analytics/types';
import { useAuth } from '@/hooks/useAuth';
import useOnboardingMilestones from '../../../lib/useOnboardingMilestones';
import WhatNextTile from '../../whatNextTile/WhatNextTile';
import ConnectTileCards from '../../connectTileCards/ConnectTileCards';
import SaveTileCards from '../../saveTileCards/SaveTileCards';
import InstallOptions from '../../installOptions/InstallOptions';
import OptionTile, { iconMark } from '../../optionTile/OptionTile';
import StepHeading from '../../stepHeading/StepHeading';

const DOCS_URL = 'https://docs.cosmik.network/semble';

interface Props {
  title: string;
  onComplete: () => void;
}

export default function WhatNextStep(props: Props) {
  const stats = useMyProfileStats();
  const { user } = useAuth();
  const onboarding = useOnboardingMilestones();

  const [composerOpen, composer] = useDisclosure(false);
  const [collectionOpen, collectionDrawer] = useDisclosure(false);

  const [openPanel, setOpenPanel] = useState<'save' | 'connect' | null>(null);

  const togglePanel = (panel: 'save' | 'connect') =>
    setOpenPanel((current) => (current === panel ? null : panel));

  // A full-width panel can only be inserted at a row boundary, so the column
  // count has to be known. These mirror SimpleGrid's own breakpoints below;
  // `false` is the SSR value, and no panel is open on first paint.
  const twoUp = useMediaQuery('(min-width: 36em)', false);
  const threeUp = useMediaQuery('(min-width: 48em)', false);
  const columns = threeUp ? 3 : twoUp ? 2 : 1;

  // A one-way latch: the drawer reports the creation, but the stats query
  // behind it will not have refetched yet.
  const [createdCollection, setCreatedCollection] = useState(false);

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
      title: 'Save your first link',
      description: 'Save a link (card) so that it’s easier to find again, and to make it easier for others to discover the same content.',
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
      title: 'Pick a card to connect',
      description: 'Then choose what it relates to, and why',
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
        title={props.title}
        description="Learn about the rest of Semble’s features, setup your workflow, or explore the app."
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
        <InstallOptions
          onSelect={(surface) => {
            onboarding.recordInstallClicked(surface);
            props.onComplete();
          }}
        />
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

      {/* Composer is the drawer itself; ComposerDrawer is the global FAB
          wrapper and must not be used here. It runs useMyCollections at the top
          of its body, so it suspends even while closed. */}
      <Suspense fallback={null}>
        <Composer
          isOpen={composerOpen}
          onClose={composer.close}
          initialMode="card"
          saveSource={CardSaveSource.ONBOARDING}
        />
      </Suspense>

      <CreateCollectionDrawer
        isOpen={collectionOpen}
        onClose={collectionDrawer.close}
        // Only the tick. The collection itself is recorded by
        // useCreateCollection, because this callback silently does not fire
        // when the new collection is missing from the refetched list cache.
        onCreate={() => setCreatedCollection(true)}
        analyticsContext={{
          saveSource: CardSaveSource.ONBOARDING,
          pagePath: '/onboarding',
        }}
      />
    </Stack>
  );
}
