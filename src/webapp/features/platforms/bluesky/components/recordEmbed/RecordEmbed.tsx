import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import {
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
} from '@atproto/api';
import { Stack, Group, Avatar, Box, Text, Card } from '@mantine/core';
import PostEmbed from '../postEmbed/PostEmbed';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  embed: AppBskyEmbedRecord.View['record'];
  media?: AppBskyEmbedRecordWithMedia.View['media'];
}

export default function RecordEmbed(props: Props) {
  if (
    AppBskyEmbedRecord.isViewBlocked(props.embed) ||
    AppBskyEmbedRecord.isViewNotFound(props.embed) ||
    !AppBskyEmbedRecord.isViewRecord(props.embed)
  ) {
    return null;
  }

  const post = props.embed;
  const { settings } = useUserSettings();

  return (
    <Stack gap={'xs'}>
      {props.media && <PostEmbed embed={props.media} />}
      <Card p={'sm'} flex={1} h={'100%'} withBorder>
        <Stack justify="space-between" align="start" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <Avatar
              src={post.author.avatar?.replace('avatar', 'avatar_thumbnail')}
              alt={`${post.author.handle} avatar`}
              radius="xl"
              size={'sm'}
            />

            <Text c="bright" lineClamp={1} fw={500} w="fit-content">
              {post.author.displayName || post.author.handle}
            </Text>
          </Group>
          <Stack gap={'xs'}>
            <Box>
              <RichTextRenderer
                text={(post.value as AppBskyFeedPost.Record).text}
                textProps={{ lineClamp: 1 }}
              />
            </Box>
            {/* don't show quoted post's embed on card */}
            {post.embeds && settings.cardView !== 'grid' && (
              <PostEmbed embed={post.embeds[0]} />
            )}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
