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

interface Props {
  url: string;
  fallbackCardContent: ReactElement;
}

export default function BlueskyPost(props: Props) {
  const uri = getPostUriFromUrl(props.url);
  const { data, error } = useGetBlueskyPost({ uri });
  const platform = detectUrlPlatform(props.url);
  const platformIcon =
    platform === SupportedPlatform.BLUESKY_POST ? (
      <FaBluesky fill="#0085ff" size={18} />
    ) : (
      <>
        <Image
          src={BlackskyLogo.src}
          alt="Blacksky logo"
          w={18}
          h={'100%'}
          darkHidden
        />
        <Image
          src={BlackskyLogoWhite.src}
          alt="Blacksky logo"
          w={18}
          h={'100%'}
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
            src={post.author.avatar}
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
          <RichTextRenderer text={record.text} textProps={{ lineClamp: 3 }} />
        </Box>
        {post.embed && <PostEmbed embed={post.embed} mode="card" />}
      </Stack>
    </Stack>
  );
}
