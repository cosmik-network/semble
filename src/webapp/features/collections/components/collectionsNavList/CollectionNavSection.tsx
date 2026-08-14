'use client';

import { NavLink, Stack } from '@mantine/core';
import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LinkNavLink } from '@/components/link/MantineLink';
import { CollectionNavSectionError } from './Error.CollectionsNavList';
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
        <ErrorBoundary fallback={<CollectionNavSectionError />}>
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
