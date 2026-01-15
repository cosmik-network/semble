import BlueskyMentionsContainer from '@/features/platforms/bluesky/container/blueskyMentionsContainer/BlueskyMentionsContainer';
import LeafletMentionsContainer from '@/features/platforms/leaflet/container/leafletMentionsContainer/LeafletMentionsContainer';
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
import LeafletMentionsContainerSkeleton from '@/features/platforms/leaflet/container/leafletMentionsContainer/Skeleton.LeafletMentionsContainer';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';

interface Props {
  url: string;
}

type Platform = 'Bluesky' | 'Leaflet';

export default function SembleMentionsContainer(props: Props) {
  const { data: featureFlags } = useFeatureFlags();
  const combobox = useCombobox();
  const [platform, setPlatform] = useState<Platform>('Bluesky');

  const [sortOption, setSortOption] =
    useState<BlueskySearchSortOptions>('latest');

  const renderContent = () => {
    if (platform === 'Bluesky') {
      return (
        <Suspense fallback={<BlueskyMentionsContainerSkeleton />}>
          <BlueskyMentionsContainer url={props.url} sortBy={sortOption} />
        </Suspense>
      );
    }

    if (platform === 'Leaflet') {
      return (
        <Suspense fallback={<LeafletMentionsContainerSkeleton />}>
          <LeafletMentionsContainer url={props.url} />
        </Suspense>
      );
    }

    return null;
  };

  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Combobox
          onOptionSubmit={(optionValue) => {
            setPlatform(optionValue as Platform);
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
          <Combobox.Dropdown>
            <Combobox.Option value="Bluesky">Bluesky</Combobox.Option>
            {featureFlags?.leafletMentions && (
              <Combobox.Option value="Leaflet">Leaflet</Combobox.Option>
            )}
          </Combobox.Dropdown>
        </Combobox>
        {platform === 'Bluesky' && (
          <Select
            ml={'auto'}
            size="sm"
            variant="filled"
            allowDeselect={false}
            value={sortOption}
            onChange={(value) =>
              setSortOption(value as BlueskySearchSortOptions)
            }
            data={[
              { value: 'latest', label: 'Latest' },
              { value: 'top', label: 'Top' },
            ]}
          />
        )}
      </Group>
      {renderContent()}
    </Stack>
  );
}
