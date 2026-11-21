import { AppBskyFeedDefs } from '@atproto/api';
import { getBlueskyPost } from '../../lib/dal';
import SembleHeader from '@/features/semble/components/SembleHeader/SembleHeader';
import { getPostUriFromUrl } from '@/lib/utils/atproto';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { Stack, Tooltip, Anchor, Card, Group, Alert } from '@mantine/core';
import BlueskyPlatformIcon from '../blueskyPlatformIcon/BlueskyPlatformIcon';
import BlueskySemblePostCard from './BlueskySemblePostCard';
import { getPostModerationUI } from '../../lib/moderation';

import { Suspense } from 'react';
import UrlTypeBadge from '@/features/semble/components/urlTypeBadge/UrlTypeBadge';
import UrlTypeBadgeSkeleton from '@/features/semble/components/urlTypeBadge/Skeleton.UrlTypeBadge';

interface Props {
  url: string;
}

export default async function BlueskySemblePost(props: Props) {
  const postUri = getPostUriFromUrl(props.url);
  const data = await getBlueskyPost(postUri);

  const platform = detectUrlPlatform(props.url);
  const platformIcon = <BlueskyPlatformIcon platform={platform.type} />;

  if (!data) {
    return (
      <Stack gap={'xs'}>
        <Suspense fallback={<UrlTypeBadgeSkeleton />}>
          <UrlTypeBadge url={props.url} />
        </Suspense>
        <Card p={'xs'} radius={'lg'} withBorder>
          <Stack gap={'xs'}>
            <Group gap="xs" justify="flex-end">
              <Tooltip
                label={`View on ${platform.type === SupportedPlatform.BLUESKY_POST ? 'Bluesky' : 'Blacksky'}`}
              >
                <Anchor href={props.url} target="_blank">
                  {platformIcon}
                </Anchor>
              </Tooltip>
            </Group>
            <Alert
              component={'button'}
              variant="transparent"
              mx={'auto'}
              color="gray"
              p={'sm'}
              title="Post not found"
            />
          </Stack>
        </Card>
      </Stack>
    );
  }

  if (
    !data.thread ||
    !AppBskyFeedDefs.isThreadViewPost(data.thread) ||
    AppBskyFeedDefs.isNotFoundPost(data.thread.post) ||
    AppBskyFeedDefs.isBlockedPost(data.thread.post)
  ) {
    // fallback
    return <SembleHeader url={props.url} />;
  }

  const post = data.thread.post;
  const moderation = getPostModerationUI(post);

  if (moderation.filter) {
    return <SembleHeader url={props.url} />;
  }

  return (
    <Stack gap={'xs'}>
      <Suspense fallback={<UrlTypeBadgeSkeleton />}>
        <UrlTypeBadge url={props.url} />
      </Suspense>

      <BlueskySemblePostCard post={post} url={props.url} />
    </Stack>
  );
}
