'use client';

import { NavLink, Skeleton, Stack, Text } from '@mantine/core';
import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LinkNavLink } from '@/components/link/MantineLink';
import { useNavbarContext } from '@/providers/navbar';

interface Props {
  label: string;
  icon: ReactNode;
  opened: boolean;
  onChange: (opened: boolean) => void;
  /** One of the two: a page to link to, or a handler (e.g. open a drawer). */
  viewAllHref?: string;
  onViewAll?: () => void;
  errorMessage: string;
  children: ReactNode;
}

function ListSkeleton() {
  return (
    <Stack gap={0} px={'sm'}>
      <Skeleton h={25} my={'xxs'} w={'100%'} />
      <Skeleton h={25} my={'xxs'} w={'100%'} />
    </Stack>
  );
}

export default function LibraryNavSection(props: Props) {
  const { toggleMobile } = useNavbarContext();

  return (
    <NavLink
      label={props.label}
      leftSection={props.icon}
      c={'gray'}
      opened={props.opened}
      onChange={props.onChange}
      childrenOffset={10}
    >
      <Stack gap={0}>
        <ErrorBoundary
          fallback={
            <Text fz={'sm'} c={'red'} px={'sm'} py={'xxs'}>
              {props.errorMessage}
            </Text>
          }
        >
          <Suspense fallback={<ListSkeleton />}>{props.children}</Suspense>
        </ErrorBoundary>
        {props.viewAllHref ? (
          <LinkNavLink
            href={props.viewAllHref}
            label="View all"
            variant="subtle"
            c="blue"
            py={'xxs'}
            onClick={toggleMobile}
          />
        ) : (
          <NavLink
            component="button"
            label="View all"
            variant="subtle"
            c="blue"
            py={'xxs'}
            onClick={() => {
              toggleMobile();
              props.onViewAll?.();
            }}
          />
        )}
      </Stack>
    </NavLink>
  );
}
