import { AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api';
import { ReactElement } from 'react';
import { Group, Stack, Text, Avatar, Box, Image } from '@mantine/core';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import useGetBlueskyPost from '../../lib/queries/useGetBlueskyPost';
import PostEmbed from '../postEmbed/PostEmbed';
import { FaBluesky } from 'react-icons/fa6';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { getPostUriFromUrl } from '@/lib/utils/atproto';
import BlackskyLogo from '@/assets/icons/blacksky-logo.svg';
import BlackskyLogoWhite from '@/assets/icons/blacksky-logo-white.svg';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  url: string;
  fallbackCardContent: ReactElement;
}

export default function BlueskyPost(props: Props) {
  const { settings } = useUserSettings();
  const uri = getPostUriFromUrl(props.url);
  const { data, error } = useGetBlueskyPost({ uri });
  const showEmbed = settings.cardView !== 'list';
  const platform = detectUrlPlatform(props.url);
  const platformIcon =
    platform.type === SupportedPlatform.BLUESKY_POST ? (
      <FaBluesky fill="#0085ff" size={18} />
    ) : (
      <>
        <Image
          src={BlackskyLogo.src}
          alt="Blacksky logo"
          w={18}
          h={'auto'}
          darkHidden
        />
        <Image
          src={BlackskyLogoWhite.src}
          alt="Blacksky logo"
          w={18}
          h={'auto'}
          lightHidden
        />
      </>
    );

  if (
    !data.thread ||
    !AppBskyFeedDefs.isThreadViewPost(data.thread) ||
    AppBskyFeedDefs.isNotFoundPost(data.thread.post) ||
    AppBskyFeedDefs.isBlockedPost(data.thread.post) ||
    error
  ) {
    return props.fallbackCardContent;
  }

  const post = data.thread.post;
  const record = post.record as AppBskyFeedPost.Record;

  return (
    <Stack justify="space-between" gap="xs">
      <Group gap="xs" justify="space-between" wrap="nowrap" w={'100%'}>
        <Group gap={'xs'} wrap="nowrap">
          <Avatar
            src={post.author.avatar?.replace('avatar', 'avatar_thumbnail')}
            alt={`${post.author.handle} avatar`}
            size={'sm'}
            radius="xl"
          />

          <Text c="bright" lineClamp={1} fw={500}>
            {post.author.displayName || post.author.handle}
          </Text>
        </Group>
        {platformIcon}
      </Group>
      <Stack gap={'xs'} w={'100%'}>
        <Box>
          <RichTextRenderer
            text={record.text}
            textProps={{ lineClamp: settings.cardView === 'list' ? 1 : 3 }}
          />
        </Box>
        {post.embed && showEmbed && <PostEmbed embed={post.embed} />}
      </Stack>
    </Stack>
  );
}
