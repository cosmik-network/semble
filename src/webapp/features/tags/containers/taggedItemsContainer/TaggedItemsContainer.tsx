'use client';

import { Group, Stack, Text } from '@mantine/core';
import { Suspense } from 'react';
import { TaggedItemType } from '@semble/types';
import { TagFilters } from '../../components/tagFilters/TagFilters';
import TaggedCardsContainerContent from '../taggedCardsContainerContent/TaggedCardsContainerContent';
import TaggedCollectionsContainerContent from '../taggedCollectionsContainerContent/TaggedCollectionsContainerContent';
import TaggedConnectionsContainerContent from '../taggedConnectionsContainerContent/TaggedConnectionsContainerContent';
import TaggedItemsContainerSkeleton from './Skeleton.TaggedItemsContainer';

interface Props {
  tag: string;
  itemType: TaggedItemType;
  handleOrDid?: string;
}

export default function TaggedItemsContainer(props: Props) {
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

      <Suspense
        key={`${props.tag}|${props.handleOrDid ?? ''}`}
        fallback={<TaggedItemsContainerSkeleton />}
      >
        {props.itemType === 'card' ? (
          <TaggedCardsContainerContent
            tag={props.tag}
            handleOrDid={props.handleOrDid}
          />
        ) : props.itemType === 'collection' ? (
          <TaggedCollectionsContainerContent
            tag={props.tag}
            handleOrDid={props.handleOrDid}
          />
        ) : (
          <TaggedConnectionsContainerContent
            tag={props.tag}
            handleOrDid={props.handleOrDid}
          />
        )}
      </Suspense>
    </Stack>
  );
}
