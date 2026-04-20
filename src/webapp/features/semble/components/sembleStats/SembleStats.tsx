import { AvatarGroup, Divider, Group, Text, ThemeIcon } from '@mantine/core';
import { getLibrariesForUrl } from '../../lib/dal';
import { LinkAvatar } from '@/components/link/MantineLink';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { BiCollection, BiLink } from 'react-icons/bi';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { LuLibrary } from 'react-icons/lu';

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
    <Group gap={5}>
      <Group gap={'xs'}>
        <Group gap={5}>
          {data.libraries.length > 0 ? (
            <AvatarGroup>
              {data.libraries.slice(0, 4).map((p, i) => (
                <LinkAvatar
                  key={i}
                  href={`/profile/${p.user.handle}`}
                  src={p.user.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
                  alt={p.user.handle}
                  name={p.user.handle}
                  size={'25'}
                />
              ))}
            </AvatarGroup>
          ) : (
            <ThemeIcon variant="light" size={'sm'}>
              <LuLibrary size={12} />
            </ThemeIcon>
          )}

          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.libraryCount}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.libraryCount === 1 ? 'Save' : 'Saves'}
          </Text>
        </Group>

        <Divider orientation="vertical" />

        <Group gap={5}>
          <ThemeIcon variant="light" size={'sm'}>
            <BiCollection size={12} />
          </ThemeIcon>
          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.collectionCount}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.collectionCount === 1 ? 'Collection' : 'Collections'}
          </Text>
        </Group>

        <Divider orientation="vertical" />

        <Group gap={5}>
          <ThemeIcon variant="light" size={'sm'}>
            <BiLink size={12} />
          </ThemeIcon>
          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.connections.all.total}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.connections.all.total === 1 ? 'Connection' : 'Connections'}
          </Text>
        </Group>

        <Divider orientation="vertical" />

        <Group gap={5}>
          <ThemeIcon variant="light" size={'sm'}>
            <MdOutlineStickyNote2 size={12} />
          </ThemeIcon>
          <Text fw={500} fz={'sm'} c={'bright'}>
            {stats?.noteCount}
          </Text>
          <Text fw={500} fz={'sm'} c={'dimmed'}>
            {stats?.noteCount === 1 ? 'Note' : 'Notes'}
          </Text>
        </Group>
      </Group>
    </Group>
  );
}
