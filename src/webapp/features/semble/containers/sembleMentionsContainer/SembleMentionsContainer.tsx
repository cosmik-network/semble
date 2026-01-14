import BlueskyMentionsContainer from '@/features/platforms/bluesky/container/blueskyMentionsContainer/BlueskyMentionsContainer';
import { BlueskySearchSortOptions } from '@/features/platforms/bluesky/lib/types';
import {
  Button,
  Combobox,
  Group,
  Select,
  Stack,
  useCombobox,
} from '@mantine/core';
import { Suspense, useState } from 'react';
import BlueskyMentionsContainerSkeleton from '@/features/platforms/bluesky/container/blueskyMentionsContainer/Skeleton.BlueskyMentionsContainer';

interface Props {
  url: string;
}

export default function SembleMentionsContainer(props: Props) {
  const combobox = useCombobox();
  const [platform, setPlatform] = useState('Bluesky');

  const [sortOption, setSortOption] =
    useState<BlueskySearchSortOptions>('latest');

  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Combobox
          onOptionSubmit={(optionValue) => {
            setPlatform(optionValue);
            combobox.closeDropdown();
          }}
          store={combobox}
        >
          <Combobox.Target>
            <Button
              variant="light"
              color="gray"
              onClick={() => combobox.toggleDropdown()}
            >
              {platform}
            </Button>
          </Combobox.Target>
        </Combobox>
        <Select
          ml={'auto'}
          size="sm"
          variant="filled"
          allowDeselect={false}
          value={sortOption}
          onChange={(value) => setSortOption(value as BlueskySearchSortOptions)}
          data={[
            { value: 'latest', label: 'Latest' },
            { value: 'top', label: 'Top' },
          ]}
        />
      </Group>
      <Suspense fallback={<BlueskyMentionsContainerSkeleton />}>
        <BlueskyMentionsContainer url={props.url} sortBy={sortOption} />
      </Suspense>
    </Stack>
  );
}
