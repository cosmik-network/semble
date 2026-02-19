import {
  Container,
  Stack,
  Group,
  Avatar,
  Text,
  Title,
  Spoiler,
  Grid,
  GridCol,
  ActionIcon,
  Tooltip,
  Image,
  Anchor,
  Badge,
  Card,
} from '@mantine/core';
import MinimalProfileHeaderContainer from '../../containers/minimalProfileHeaderContainer/MinimalProfileHeaderContainer';
import { FaBluesky } from 'react-icons/fa6';
import { getProfile } from '../../lib/dal.server';
import { Fragment } from 'react';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import Link from 'next/link';

interface Props {
  handle: string;
}

export default async function ProfileHeader(props: Props) {
  const session = await verifySessionOnServer();
  const profile = await getProfile(props.handle);
  const featureFlags = await getServerFeatureFlags();

  return (
    <Fragment>
      {profile.bannerUrl ? (
        <Image src={profile.bannerUrl} h={150} />
      ) : (
        <Card h={150} bg={'var(--mantine-color-disabled)'} radius={0} />
      )}
      <Container p={0} m={0} fluid>
        <MinimalProfileHeaderContainer
          avatarUrl={profile.avatarUrl}
          name={profile.name}
          handle={profile.handle}
        />
      </Container>
      <Container p={0} size={'xl'}>
        <Stack gap={'sm'} p={'xs'}>
          <Stack gap={'xs'}>
            <Grid gutter={'sm'} align="start" grow>
              <GridCol span={'content'}>
                <Avatar
                  src={profile.avatarUrl}
                  alt={`${profile.name}'s avatar`}
                  radius={'lg'}
                  size={'95px'}
                  mt={'-57.5'}
                  style={{
                    border: '2.5px solid var(--mantine-color-body)',
                  }}
                />
              </GridCol>

              <GridCol span={'content'}>follow buttons</GridCol>
            </Grid>

            {/* profile info */}
            <Stack gap={'sm'}>
              <Stack gap={0}>
                <Title order={1} fz={'h2'} c={'bright'}>
                  {profile.name}
                </Title>
                <Group gap={'xs'}>
                  {profile.followsYou && (
                    <Badge variant="light" color="gray">
                      Follows you
                    </Badge>
                  )}
                  <Text c="gray" fw={600} fz={'lg'}>
                    @{profile.handle}
                  </Text>
                  <Tooltip label="View Bluesky Profile">
                    <ActionIcon
                      component="a"
                      href={`https://bsky.app/profile/${profile.handle}`}
                      target="_blank"
                      variant="light"
                      color="blue"
                      radius={'xl'}
                    >
                      <FaBluesky size={14} fill="#0085ff" />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Stack>
              {profile.description && (
                <Spoiler
                  showLabel={'Read more'}
                  hideLabel={'See less'}
                  maxHeight={75}
                  maw={700}
                >
                  <RichTextRenderer text={profile.description} />
                </Spoiler>
              )}

              {/* follow stats */}
              {featureFlags.following && (
                <Group gap="sm">
                  <Anchor
                    component={Link}
                    href={`/profile/${props.handle}/followers`}
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
                    href={`/profile/${props.handle}/following`}
                    underline="never"
                  >
                    <Text fw={500} c={'bright'} span>
                      {profile.followingCount}
                    </Text>
                    <Text fw={500} c={'gray'} span>
                      {' Following'}
                    </Text>
                  </Anchor>

                  <Anchor
                    component={Link}
                    href={`/profile/${props.handle}/following-collections`}
                    underline="never"
                  >
                    <Text fw={500} c={'bright'} span>
                      {profile.followedCollectionsCount}
                    </Text>
                    <Text fw={500} c={'gray'} span>
                      {' Followed Collections'}
                    </Text>
                  </Anchor>
                </Group>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  );
}
