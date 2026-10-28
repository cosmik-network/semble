'use client';

import { Box, NavLink, Stack, Text } from '@mantine/core';
import { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LinkNavLink } from '@/components/link/MantineLink';
import { useNavbarContext } from '@/providers/navbar';
import LibraryNavSectionSkeleton from './Skeleton.LibraryNavSection';

interface Props {
  label: string;
  icon: ReactNode;
  opened: boolean;
  onChange: (opened: boolean) => void;
  /** One of the two: a page to link to, or a handler (e.g. open a drawer). */
  viewAllHref?: string;
  onViewAll?: () => void;
  errorMessage: string;
  /** Shown beside the chevron, e.g. a button that adds an item. */
  action?: ReactNode;
  children: ReactNode;
}

export default function LibraryNavSection(props: Props) {
  const { toggleMobile } = useNavbarContext();

  const section = (
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
          <Suspense fallback={<LibraryNavSectionSkeleton />}>
            {props.children}
          </Suspense>
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

  if (!props.action) return section;

  // A sibling rather than the rightSection: a button can't nest in the
  // NavLink's own button
  return (
    <Box pos="relative">
      {section}
      <Box pos="absolute" top={8} right={36}>
        {props.action}
      </Box>
    </Box>
  );
}
