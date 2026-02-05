'use client';

import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import {
  Anchor,
  Avatar,
  Box,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { PostView } from '@semble/types';
import { FaBluesky } from 'react-icons/fa6';
import PostEmbed from '../postEmbed/PostEmbed';
import styles from './BlueskyMentionPost.module.css';
import { AppBskyFeedPost } from '@atproto/api';
import { useRouter } from 'next/navigation';
import { MouseEvent } from 'react';
import { getPostRkeyFromUri } from '../../lib/utils/link';

interface Props {
  post: PostView;
}

export default function BlueskyMentionPost(props: Props) {
  const record = props.post.record as AppBskyFeedPost.Record;
  const router = useRouter();

  const handleNavigateToPost = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    router.push(
      `/url?id=https://bsky.app/profile/${props.post.author.did}/post/${getPostRkeyFromUri(props.post.uri)}`,
    );
  };

  return (
    <Card
      component={'article'}
      radius={'lg'}
      p={'sm'}
      flex={1}
      h={'100%'}
      withBorder
      className={styles.root}
      onClick={handleNavigateToPost}
    >
      <Stack justify="space-between" gap={'sm'} flex={1}>
        <Stack justify="space-between" gap="xs">
          <Group gap="xs" justify="space-between" wrap="nowrap" w={'100%'}>
            <Group gap={'xs'} wrap="nowrap">
              <Avatar
                src={props.post.author.avatar?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${props.post.author.handle} avatar`}
                size={'sm'}
                radius="xl"
              />

              <Text c="bright" lineClamp={1} fw={500}>
                {props.post.author.displayName || props.post.author.handle}
              </Text>
            </Group>
            <Tooltip label="View on Bluesky">
              <Anchor
                href={`https://bsky.app/profile/${props.post.author.did}/post/${getPostRkeyFromUri(props.post.uri)}`}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                <FaBluesky fill="#0085ff" size={18} />
              </Anchor>
            </Tooltip>
          </Group>
          <Stack gap={'xs'} w={'100%'}>
            {<Box>{<RichTextRenderer text={record.text} />}</Box>}
            {props.post.embed && <PostEmbed embed={props.post.embed} />}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
