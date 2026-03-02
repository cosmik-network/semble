import {
  Anchor,
  Avatar,
  Button,
  Group,
  HoverCard,
  HoverCardDropdown,
  HoverCardTarget,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import useProfile from '../../lib/queries/useProfile';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import Link from 'next/link';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';

interface Props {
  children: React.ReactNode;
  didOrHandle: string;
}

export default function ProfileHoverCard(props: Props) {
  const {
    data: profile,
    isLoading,
    isError,
  } = useProfile({ didOrHandle: props.didOrHandle });

  return (
    <HoverCard width={300} radius={'lg'} shadow="sm">
      <HoverCardTarget>{props.children}</HoverCardTarget>
      <HoverCardDropdown p={'xs'}>
        {isLoading && (
          <Stack align="center" justify="center" h={200}>
            <Loader size="sm" />
          </Stack>
        )}

        {isError && (
          <Stack align="center" justify="center" h={200}>
            <Text c="dimmed">Failed to load profile</Text>
          </Stack>
        )}

        {profile && (
          <Stack gap={'sm'}>
            <Avatar
              src={profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
              size={'lg'}
            />
            <Stack gap={0}>
              <Text fw={600} c={'bright'}>
                {profile.name || profile.handle}
              </Text>
              <Text fw={500} c={'gray'}>
                @{profile.handle}
              </Text>
            </Stack>

            {/* Follow stats */}
            <Group gap="xs">
              <Anchor
                component={Link}
                href={`/profile/${profile.handle}/network`}
                underline="never"
              >
                <Text fw={500} c={'bright'} span>
                  {profile.followerCount}
                </Text>
                <Text fw={500} c={'gray'} span>
                  {' Follower'}
                  {profile.followerCount !== 1 ? 's' : ''}
                </Text>
              </Anchor>

              <Anchor
                component={Link}
                href={`/profile/${profile.handle}/network/following`}
                underline="never"
              >
                <Text fw={500} c={'bright'} span>
                  {profile.followingCount}
                </Text>
                <Text fw={500} c={'gray'} span>
                  {' Following'}
                </Text>
              </Anchor>
            </Group>
            {profile.description && (
              <RichTextRenderer text={profile.description} />
            )}
            <Group gap={'xs'} grow>
              <Button
                component={Link}
                href={`/profile/${profile.handle}/cards`}
                variant="light"
                color="gray"
                leftSection={<FaRegNoteSticky />}
              >
                Cards
              </Button>
              <Button
                component={Link}
                href={`/profile/${profile.handle}/collections`}
                variant="light"
                color={'grape'}
                leftSection={<BiCollection />}
              >
                Collections
              </Button>
            </Group>
          </Stack>
        )}
      </HoverCardDropdown>
    </HoverCard>
  );
}
