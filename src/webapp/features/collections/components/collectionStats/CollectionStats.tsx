'use client';

import { Card, Flex, Group } from '@mantine/core';
import { ReactNode, Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Collection, CollectionAccessType } from '@semble/types';
import { HiUsers } from 'react-icons/hi';
import { LuLibrary } from 'react-icons/lu';
import { FaSeedling } from 'react-icons/fa6';
import useCollectionFollowers from '@/features/follows/lib/queries/useCollectionFollowers';
import useSembleLibraries from '@/features/semble/lib/queries/useSembleLibraries';
import useCollectionContributors from '../../lib/queries/useCollectionContributors';
import CollectionFollowersContainer from '@/features/follows/containers/collectionFollowersContainer/CollectionFollowersContainer';
import CollectionFollowersContainerSkeleton from '@/features/follows/containers/collectionFollowersContainer/Skeleton.CollectionFollowersContainer';
import SembleAddedByContainer from '@/features/semble/containers/sembleAddedByContainer/SembleAddedByContainer';
import SembleAddedByContainerSkeleton from '@/features/semble/containers/sembleAddedByContainer/Skeleton.SembleAddedByContainer';
import CollectionContributorsContainer from '../../containers/collectionContributorsContainer/CollectionContributorsContainer';
import CollectionContributorsContainerSkeleton from '../../containers/collectionContributorsContainer/Skeleton.CollectionContributorsContainer';
import CollectionStatDrawer from '../collectionStatDrawer/CollectionStatDrawer';
import CollectionStatChip from './CollectionStatChip';
import CollectionStatChipSkeleton from './Skeleton.CollectionStatChip';
import classes from './CollectionStats.module.css';

const PREVIEW_LIMIT = 3;

interface Props {
  collection: Collection;
  handle: string;
  rkey: string;
}

interface ChipProps {
  collectionId: string;
  collectionUrl: string;
}

function FollowersChip(props: ChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useCollectionFollowers({
    collectionId: props.collectionId,
    limit: PREVIEW_LIMIT,
  });
  const page = data.pages[0];

  return (
    <>
      <CollectionStatChip
        onClick={() => setIsOpen(true)}
        icon={<HiUsers />}
        count={page.pagination.totalCount}
        label="Follower"
        labelPlural="Followers"
        avatars={page.users.map((user) => ({
          key: user.id,
          src: user.avatarUrl,
          alt: `${user.name}'s avatar`,
        }))}
      />
      <CollectionStatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Followers"
        skeleton={<CollectionFollowersContainerSkeleton />}
        errorMessage="Could not load collection followers"
      >
        <CollectionFollowersContainer collectionId={props.collectionId} />
      </CollectionStatDrawer>
    </>
  );
}

function AddedByChip(props: ChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useSembleLibraries({
    url: props.collectionUrl,
    limit: PREVIEW_LIMIT,
  });
  const page = data.pages[0];

  return (
    <>
      <CollectionStatChip
        onClick={() => setIsOpen(true)}
        icon={<LuLibrary />}
        count={page.pagination.totalCount}
        label="Added by"
        labelPlural="Added by"
        avatars={page.libraries.map((item) => ({
          key: item.user.id,
          src: item.user.avatarUrl,
          alt: `${item.user.name}'s avatar`,
        }))}
      />
      <CollectionStatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Added by"
        skeleton={<SembleAddedByContainerSkeleton />}
        errorMessage="Could not load libraries"
      >
        <SembleAddedByContainer url={props.collectionUrl} />
      </CollectionStatDrawer>
    </>
  );
}

function ContributorsChip(props: ChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useCollectionContributors({
    collectionId: props.collectionId,
    limit: PREVIEW_LIMIT,
  });
  const page = data.pages[0];

  return (
    <>
      <CollectionStatChip
        onClick={() => setIsOpen(true)}
        icon={<FaSeedling />}
        count={page.pagination.totalCount}
        label="Contributor"
        labelPlural="Contributors"
        avatars={page.users.map((user) => ({
          key: user.id,
          src: user.avatarUrl,
          alt: `${user.name}'s avatar`,
        }))}
      />
      <CollectionStatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Contributors"
        skeleton={<CollectionContributorsContainerSkeleton />}
        errorMessage="Could not load collection contributors"
      >
        <CollectionContributorsContainer collectionId={props.collectionId} />
      </CollectionStatDrawer>
    </>
  );
}

// Each chip loads on its own; a failed one disappears instead of taking the
// header down with it.
function ChipBoundary(props: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={<CollectionStatChipSkeleton />}>
        {props.children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function CollectionStats(props: Props) {
  const { collection } = props;
  const collectionUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:4000'}/profile/${props.handle}/collections/${props.rkey}`;

  const chipProps: ChipProps = {
    collectionId: collection.id,
    collectionUrl,
  };

  return (
    <Card p={'xxs'} radius={'md'} className={classes.root}>
      <Flex wrap="wrap" align="center" columnGap="lg" rowGap="xs">
        <ChipBoundary>
          <FollowersChip {...chipProps} />
        </ChipBoundary>
        <ChipBoundary>
          <AddedByChip {...chipProps} />
        </ChipBoundary>
        {collection.accessType === CollectionAccessType.OPEN && (
          <ChipBoundary>
            <ContributorsChip {...chipProps} />
          </ChipBoundary>
        )}
      </Flex>
    </Card>
  );
}
