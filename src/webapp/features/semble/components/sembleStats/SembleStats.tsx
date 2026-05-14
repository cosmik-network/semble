import { Group, Text, ThemeIcon } from '@mantine/core';
import { getLibrariesForUrl } from '../../lib/dal';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { BiCollection, BiLink } from 'react-icons/bi';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { LuLibrary } from 'react-icons/lu';
import SembleStatItem from './SembleStatItem';

interface Props {
  url: string;
}

export default async function SembleStats(props: Props) {
  const { stats } = await getUrlMetadata({
    url: props.url,
    includeStats: true,
  });

  const data = await getLibrariesForUrl(props.url);

  return (
    <Group>
      <SembleStatItem tab="addedBy">
        <Group gap={5}>
          <ThemeIcon variant="transparent" color="cyan" size={'sm'}>
            <LuLibrary />
          </ThemeIcon>

          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.libraryCount}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.libraryCount === 1 ? 'Save' : 'Saves'}
          </Text>
        </Group>
      </SembleStatItem>

      <SembleStatItem tab="collections">
        <Group gap={5}>
          <ThemeIcon variant="transparent" color="cyan" size={'sm'}>
            <BiCollection />
          </ThemeIcon>
          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.collectionCount}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.collectionCount === 1 ? 'Collection' : 'Collections'}
          </Text>
        </Group>
      </SembleStatItem>

      <SembleStatItem tab="connections">
        <Group gap={5}>
          <ThemeIcon variant="transparent" color="cyan" size={'sm'}>
            <BiLink />
          </ThemeIcon>
          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.connections.all.total}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.connections.all.total === 1 ? 'Connection' : 'Connections'}
          </Text>
        </Group>
      </SembleStatItem>

      <SembleStatItem tab="notes">
        <Group gap={5}>
          <ThemeIcon variant="transparent" color="cyan" size={'sm'}>
            <MdOutlineStickyNote2 />
          </ThemeIcon>
          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.noteCount}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.noteCount === 1 ? 'Note' : 'Notes'}
          </Text>
        </Group>
      </SembleStatItem>
    </Group>
  );
}
