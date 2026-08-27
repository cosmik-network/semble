'use client';

import { NavLink, Stack, Text } from '@mantine/core';
import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LinkNavLink } from '@/components/link/MantineLink';
import { CollectionNavSectionSkeleton } from './Skeleton.CollectionsNavList';

interface Props {
  label: string;
  opened: boolean;
  onChange: (opened: boolean) => void;
  viewAllHref: string;
  onNavigate: () => void;
  children: ReactNode;
}

export default function CollectionNavSection(props: Props) {
  return (
    <NavLink
      label={props.label}
      c={'gray'}
      opened={props.opened}
      onChange={props.onChange}
      childrenOffset={10}
    >
      <Stack gap={0}>
        <ErrorBoundary
          fallback={
            // Too tight a slot for the ErrorState alert — the nav lists are
            // one line per collection.
            <Text fz={'sm'} c={'red'} px={'sm'} py={'xxs'}>
              Could not load collections
            </Text>
          }
        >
          <Suspense fallback={<CollectionNavSectionSkeleton />}>
            {props.children}
          </Suspense>
        </ErrorBoundary>
        <LinkNavLink
          href={props.viewAllHref}
          label="View all"
          variant="subtle"
          c="blue"
          py={'xxs'}
          onClick={props.onNavigate}
        />
      </Stack>
    </NavLink>
  );
}
