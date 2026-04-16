import { AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api';
import { getBlueskyPost } from '../../lib/dal';
import SembleHeader from '@/features/semble/components/SembleHeader/SembleHeader';
import { getPostUriFromUrl } from '@/lib/utils/atproto';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { getFormattedDate } from '@/lib/utils/time';
import {
  Stack,
  Tooltip,
  Anchor,
  Card,
  Group,
  Box,
  Text,
  Alert,
} from '@mantine/core';
import BlueskyPlatformIcon from '../blueskyPlatformIcon/BlueskyPlatformIcon';
import PostEmbed from '../postEmbed/PostEmbed';
import ContentHider from '../contentHider/ContentHider';
import {
  getPostModerationUI,
  getModerationReasonText,
} from '../../lib/moderation';

import { Suspense } from 'react';
import UrlTypeBadge from '@/features/semble/components/urlTypeBadge/UrlTypeBadge';
import UrlTypeBadgeSkeleton from '@/features/semble/components/urlTypeBadge/Skeleton.UrlTypeBadge';
import { isBotAccount } from '../../lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import { LinkAvatar } from '@/components/link/MantineLink';

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
  const record = post.record as AppBskyFeedPost.Record;
  const moderation = getPostModerationUI(post);

  if (moderation.filter) {
    return <SembleHeader url={props.url} />;
  }

  return (
    <Stack gap={'xs'}>
      <Suspense fallback={<UrlTypeBadgeSkeleton />}>
        <UrlTypeBadge url={props.url} />
      </Suspense>

      {/* Post */}
      <Card p={'xs'} radius={'lg'} withBorder>
        <Stack gap={'xs'}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap={'xs'} wrap="nowrap">
              <LinkAvatar
                href={`https://bsky.app/profile/${post.author.handle}`}
                src={post.author.avatar?.replace('avatar', 'avatar_thumbnail')}
                alt={`${post.author.handle} social preview image`}
                radius="xl"
              />
              <Stack gap={0} flex={1}>
                <Group gap={'xs'}>
                  <Text c="bright" lineClamp={1} fw={500} w="fit-content">
                    {post.author.displayName || post.author.handle}
                  </Text>
                  {isBotAccount(post.author) && <BotLabel />}
                </Group>

                <Text c="gray" lineClamp={1} w="fit-content">
                  @{post.author.handle}
                </Text>
              </Stack>
            </Group>
            <Tooltip
              label={`View on ${platform.type === SupportedPlatform.BLUESKY_POST ? 'Bluesky' : 'Blacksky'}`}
            >
              <Anchor href={props.url} target="_blank">
                {platformIcon}
              </Anchor>
            </Tooltip>
          </Group>
          <ContentHider
            blur={moderation.blur}
            noOverride={moderation.noOverride}
            reason={getModerationReasonText(moderation)}
          >
            <Stack gap={'xs'} w={'100%'}>
              <Box>
                <RichTextRenderer
                  text={record.text}
                  textProps={{ c: 'bright' }}
                />
              </Box>
              {post.embed && <PostEmbed embed={post.embed} />}
            </Stack>
          </ContentHider>
          <Text c={'gray'} fz={'sm'} fw={500}>
            {getFormattedDate(post.indexedAt)}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
