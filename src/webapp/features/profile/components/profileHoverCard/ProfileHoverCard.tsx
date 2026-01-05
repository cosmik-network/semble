import {
  Avatar,
  Button,
  Group,
  HoverCard,
  HoverCardDropdown,
  HoverCardTarget,
  Stack,
  Text,
} from '@mantine/core';
import useProfile from '../../lib/queries/useProfile';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
}

export default function ProfileHoverCard(props: Props) {
  const { data: profile } = useProfile({ didOrHandle: 'cosmik.bsky' });

  return (
    <HoverCard width={300} radius={'lg'} shadow="sm">
      <HoverCardTarget>{props.children}</HoverCardTarget>
      <HoverCardDropdown p={'xs'}>
        <Stack gap={'sm'}>
          <Group gap={'xs'}>
            <Avatar
              src={profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
              size={'lg'}
            />
            <Stack gap={0}>
              <Text fw={600} c={'bright'}>
                {profile.name}
              </Text>
              <Text fw={500} c={'gray'}>
                @{profile.handle}
              </Text>
            </Stack>
          </Group>
          <Text lineClamp={6}>{profile.description}</Text>
          <Group gap={'xs'} grow>
            <Button
              component={Link}
              href={`/profile/${profile.handle}/cards`}
              color="var(--mantine-color-dark-filled)"
              leftSection={<FaRegNoteSticky />}
            >
              Cards
            </Button>
            <Button
              component={Link}
              href={`/profile/${profile.handle}/collections`}
              color={'grape'}
              leftSection={<BiCollection />}
            >
              Collections
            </Button>
          </Group>
        </Stack>
      </HoverCardDropdown>
    </HoverCard>
  );
}
