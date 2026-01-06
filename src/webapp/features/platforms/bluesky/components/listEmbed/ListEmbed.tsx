import { AppBskyGraphDefs } from '@atproto/api';
import { BsFillPeopleFill } from 'react-icons/bs';
import { Card, Group, Text } from '@mantine/core';
import { getListLink } from '../../lib/utils/link';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  list: AppBskyGraphDefs.ListView;
}

export default function ListEmbed(props: Props) {
  const { settings } = useUserSettings();

  if (settings.cardView === 'grid') {
    return (
      <Card p={'xs'} withBorder>
        <Group gap={'xs'}>
          <BsFillPeopleFill />
          <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
            {props.list.name}
          </Text>
        </Group>
        <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1} span>
          @{props.list.creator.handle}
        </Text>
      </Card>
    );
  }

  return (
    <Card
      p={'xs'}
      component="a"
      href={getListLink(props.list)}
      target="_blank"
      withBorder
    >
      <Group gap={'xs'}>
        <BsFillPeopleFill />
        <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
          {props.list.name}
        </Text>
      </Group>
      <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1} span>
        @{props.list.creator.handle}
      </Text>
    </Card>
  );
}
