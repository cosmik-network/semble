'use client';

import { Center, Group, Stack, Text } from '@mantine/core';
import { BiHash } from 'react-icons/bi';
import { ReactNode } from 'react';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { TagFilters } from '../tagFilters/TagFilters';

interface Props {
  tag: string;
  handleOrDid?: string;
  count: number;
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  children: ReactNode;
}

export default function TaggedItemsLayout(props: Props) {
  return (
    <Stack gap="md">
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text flex={1} miw={0} fz={'sm'} fw={500} c={'dimmed'} lineClamp={1}>
          Showing results for{' '}
          <Text fz={'sm'} fw={600} c={'bright'} span>
            #{props.tag}
          </Text>
        </Text>
        <TagFilters.Root>
          <TagFilters.ProfileFilter />
          <TagFilters.Actions />
        </TagFilters.Root>
      </Group>

      {props.count === 0 ? (
        <Center py="xl">
          <EmptyState
            icon={BiHash}
            message={`Nothing tagged #${props.tag} here`}
            description={
              props.handleOrDid
                ? 'Try clearing the profile filter'
                : 'Try another tab'
            }
          />
        </Center>
      ) : (
        <InfiniteScroll
          dataLength={props.count}
          hasMore={props.hasMore}
          isInitialLoading={false}
          isLoading={props.isLoading}
          loadMore={props.loadMore}
        >
          <Stack gap="xs">{props.children}</Stack>
        </InfiniteScroll>
      )}
    </Stack>
  );
}
