import {
  Container,
  Stack,
  Group,
  Avatar,
  Text,
  Title,
  Spoiler,
  ActionIcon,
  Tooltip,
  Image,
  Badge,
  Card,
} from '@mantine/core';
import MinimalProfileHeaderContainer from '../../containers/minimalProfileHeaderContainer/MinimalProfileHeaderContainer';
import { FaBluesky } from 'react-icons/fa6';
import { getProfile } from '../../lib/dal.server';
import { Fragment, Suspense } from 'react';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import ProfileFollowStats from '../profileFollowStats/ProfileFollowStats';
import FollowStatsSkeleton from '../profileFollowStats/Skeleton.FollowStats';

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
            <Group justify="space-between" align="start">
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
              {props.handle !== session?.handle && (
                <FollowButton
                  targetId={profile.id}
                  targetType="USER"
                  targetHandle={props.handle}
                  initialIsFollowing={profile.isFollowing}
                />
              )}
            </Group>

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
                <Suspense fallback={<FollowStatsSkeleton />}>
                  <ProfileFollowStats
                    handle={props.handle}
                    initialFollowerCount={profile.followerCount ?? 0}
                    initialFollowingCount={profile.followingCount ?? 0}
                    initialFollowedCollectionsCount={
                      profile.followedCollectionsCount ?? 0
                    }
                  />
                </Suspense>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  );
}
