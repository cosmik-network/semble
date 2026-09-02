'use client';

import { Fragment, ReactNode, useState } from 'react';
import { Text } from '@mantine/core';
import StatChip, { StatChipAvatar } from '@/components/statChip/StatChip';
import StatDrawer from '@/components/statDrawer/StatDrawer';
import SembleAddedByContainer from '../../containers/sembleAddedByContainer/SembleAddedByContainer';
import SembleAddedByContainerSkeleton from '../../containers/sembleAddedByContainer/Skeleton.SembleAddedByContainer';

interface Props {
  url: string;
  /** Names to show, in order; at most the first two are named. */
  names: string[];
  /** Total number of people, including those not named. */
  total: number;
  avatars?: StatChipAvatar[];
}

const Dim = (props: { children: ReactNode }) => (
  <Text fw={500} fz="sm" c="dimmed" span>
    {props.children}
  </Text>
);
const Name = (props: { children: ReactNode }) => (
  <Text fw={700} fz="sm" c="bright" span>
    {props.children}
  </Text>
);

// "Added by A" · "Added by A and B" · "Added by A, B, and 3 others"
function addedBy(names: string[], total: number) {
  const [first, second] = names;
  if (total === 1) {
    return (
      <Fragment>
        <Dim>Added by </Dim>
        <Name>{first}</Name>
      </Fragment>
    );
  }
  if (total === 2 && second) {
    return (
      <Fragment>
        <Dim>Added by </Dim>
        <Name>{first}</Name>
        <Dim> and </Dim>
        <Name>{second}</Name>
      </Fragment>
    );
  }
  const others = total - (second ? 2 : 1);
  return (
    <Fragment>
      <Dim>Added by </Dim>
      <Name>{first}</Name>
      {second && (
        <Fragment>
          <Dim>, </Dim>
          <Name>{second}</Name>
          <Dim>,</Dim>
        </Fragment>
      )}
      <Dim> and </Dim>
      <Name>
        {others} {others === 1 ? 'other' : 'others'}
      </Name>
    </Fragment>
  );
}

export default function SembleStatChip(props: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <StatChip
        onClick={() => setIsOpen(true)}
        avatars={props.avatars}
        content={<span>{addedBy(props.names, props.total)}</span>}
      />
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
