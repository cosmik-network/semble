import { AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api';
import type { TextProps } from '@mantine/core';
import { Anchor, Box, Card, Group, Stack, Text, Tooltip } from '@mantine/core';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { LinkAvatar } from '@/components/link/MantineLink';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { getFormattedDate } from '@/lib/utils/time';
import BlueskyPlatformIcon from '../blueskyPlatformIcon/BlueskyPlatformIcon';
import ContentHider from '../contentHider/ContentHider';
import PostEmbed from '../postEmbed/PostEmbed';
import ThreadNumber from '../threadNumber/ThreadNumber';
import {
  getModerationReasonText,
  getPostModerationUI,
} from '../../lib/moderation';
import { isBotAccount } from '../../lib/utils/account';

interface Props {
  post: AppBskyFeedDefs.PostView;
  /** The post's bsky.app or blacksky.community URL */
  url: string;
  textProps?: Partial<TextProps>;
  /** Position in the author's self-thread, like 1/5 */
  threadNumber?: string;
}

/** A Bluesky post as the semble page shows it. Hook-free so server and client can both render it. */
export default function BlueskySemblePostCard(props: Props) {
  const record = props.post.record as AppBskyFeedPost.Record;
  const moderation = getPostModerationUI(props.post);
  const platform = detectUrlPlatform(props.url);

  return (
    <Card p={'xs'} radius={'lg'} withBorder>
      <Stack gap={'xs'}>
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Group gap={'xs'} wrap="nowrap">
            <LinkAvatar
              href={`https://bsky.app/profile/${props.post.author.handle}`}
              src={props.post.author.avatar?.replace(
                'avatar',
                'avatar_thumbnail',
              )}
              alt={`${props.post.author.handle} social preview image`}
              radius="xl"
            />
            <Stack gap={0} flex={1}>
              <Group gap={'xs'}>
                <Text c="bright" lineClamp={1} fw={500} w="fit-content">
                  {props.post.author.displayName || props.post.author.handle}
                </Text>
                {isBotAccount(props.post.author) && <BotLabel />}
              </Group>

              <Text c="gray" lineClamp={1} w="fit-content">
                @{props.post.author.handle}
              </Text>
            </Stack>
          </Group>
          <Tooltip
            label={`View on ${platform.type === SupportedPlatform.BLUESKY_POST ? 'Bluesky' : 'Blacksky'}`}
          >
            <Anchor href={props.url} target="_blank">
              <BlueskyPlatformIcon platform={platform.type} />
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
                facets={record.facets}
                textProps={{ c: 'bright', ...props.textProps }}
              />
            </Box>
            {props.post.embed && (
              <PostEmbed embed={JSON.parse(JSON.stringify(props.post.embed))} />
            )}
          </Stack>
        </ContentHider>
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Text c={'gray'} fz={'sm'} fw={500}>
            {getFormattedDate(props.post.indexedAt)}
          </Text>
          <ThreadNumber value={props.threadNumber} />
        </Group>
      </Stack>
    </Card>
  );
}
