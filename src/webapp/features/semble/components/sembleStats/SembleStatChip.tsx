'use client';

import { Fragment, useState } from 'react';
import { Group, Text } from '@mantine/core';
import StatChip, { StatChipAvatar } from '@/components/statChip/StatChip';
import StatChipCard from '@/components/statChip/StatChipCard';
import StatDrawer from '@/components/statDrawer/StatDrawer';
import { getRelativeTime } from '@/lib/utils/time';
import SembleAddedByContainer from '../../containers/sembleAddedByContainer/SembleAddedByContainer';
import SembleAddedByContainerSkeleton from '../../containers/sembleAddedByContainer/Skeleton.SembleAddedByContainer';

interface Props {
  url: string;
  name: string;
  addedAt: string;
  avatars?: StatChipAvatar[];
}

export default function SembleStatChip(props: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <StatChipCard>
        <StatChip
          onClick={() => setIsOpen(true)}
          avatars={props.avatars}
          content={
            <Group gap={4} wrap="nowrap">
              <Text fw={500} fz="sm" c="dimmed" span>
                First added by
              </Text>
              <Text fw={700} fz="sm" c="bright" span>
                {props.name}
              </Text>
              <Text fw={500} fz="sm" c="dimmed" span>
                · {getRelativeTime(props.addedAt)}
              </Text>
            </Group>
          }
        />
      </StatChipCard>
      <StatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Added by"
        skeleton={<SembleAddedByContainerSkeleton />}
        errorMessage="Could not load libraries"
      >
        <SembleAddedByContainer url={props.url} />
      </StatDrawer>
    </Fragment>
  );
}
