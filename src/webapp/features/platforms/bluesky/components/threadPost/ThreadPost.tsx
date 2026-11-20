'use client';

import type { ReactNode } from 'react';
import { AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api';
import {
  Anchor,
  Avatar,
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { TbCornerDownRight, TbEyeOff, TbTrash, TbUserX } from 'react-icons/tb';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { LinkText } from '@/components/link/MantineLink';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import { getFormattedDate, getRelativeTime } from '@/lib/utils/time';
import PostEmbed from '../postEmbed/PostEmbed';
import ContentHider from '../contentHider/ContentHider';
import {
  getModerationReasonText,
  getPostModerationUI,
} from '../../lib/moderation';
import { isBotAccount } from '../../lib/utils/account';
import {
  getPostUrl,
  isHiddenFromLoggedOut,
  postCreatedAt,
} from '../../lib/thread';
import BlueskySemblePostCard from '../blueskySemblePost/BlueskySemblePostCard';
import classes from './ThreadPost.module.css';

// Bluesky's thread screen sizes
const LINEAR_AVATAR = 42;
const TREE_AVATAR = 24;
const THREAD_LINE = 'var(--thread-line)';

export type TombstoneKind = 'blocked' | 'notFound' | 'loggedOut' | 'filtered';

// 2px rendered at 18px, to match the semibold label
const TOMBSTONE_STROKE = (2 * 24) / 18;

const TOMBSTONE: Record<TombstoneKind, { icon: ReactNode; label: string }> = {
  blocked: {
    icon: <TbUserX size={18} strokeWidth={TOMBSTONE_STROKE} />,
    label: 'Post blocked',
  },
  notFound: {
    icon: <TbTrash size={18} strokeWidth={TOMBSTONE_STROKE} />,
    label: 'Post not found',
  },
  loggedOut: {
    icon: <TbEyeOff size={18} strokeWidth={TOMBSTONE_STROKE} />,
    label: 'This author hides their posts from logged-out viewers',
  },
  filtered: {
    icon: <TbEyeOff size={18} strokeWidth={TOMBSTONE_STROKE} />,
    label: 'Hidden by moderation',
  },
};

export function ThreadTombstone(props: {
  uri: string;
  kind: TombstoneKind;
  compact?: boolean;
  href?: string;
}) {
  const { icon, label } = TOMBSTONE[props.kind];
  const text = (
    <Text fz="sm" fw={500} c="dimmed">
      {label}
      {props.href && (
        <>
          {' · '}
          <Anchor href={props.href} target="_blank" inherit c="blue">
            View on Bluesky
          </Anchor>
        </>
      )}
    </Text>
  );

  if (props.compact) {
    return (
      <Paper
        data-post-uri={props.uri}
        radius="sm"
        bg="var(--mantine-color-default-hover)"
        px="xs"
        py="xs"
      >
        <Group gap={6} wrap="nowrap" mih={20}>
          <Box c="dimmed" display="flex" flex="none">
            {icon}
          </Box>
          {text}
        </Group>
      </Paper>
    );
  }

  // Shaped like a list post, with an outlined bubble
  return (
    <Group data-post-uri={props.uri} gap="xs" wrap="nowrap">
      <ThemeIcon
        size={LINEAR_AVATAR}
        radius="xl"
        variant="light"
        color="gray"
        c="dimmed"
      >
        {icon}
      </ThemeIcon>
      <Paper
        withBorder
        radius="lg"
        px="sm"
        py="xs"
        flex={1}
        miw={0}
        bg="transparent"
        style={{ borderStyle: 'dashed' }}
      >
        {text}
      </Paper>
    </Group>
  );
}

/** Why a post can't be shown, if it can't */
export function postTombstone(
  post: AppBskyFeedDefs.PostView,
): TombstoneKind | null {
  if (isHiddenFromLoggedOut(post)) return 'loggedOut';
  // contentList is where labels like !hide filter a reply out
  if (getPostModerationUI(post, 'contentList').filter) return 'filtered';
  return null;
}

function AuthorBadges(props: {
  post: AppBskyFeedDefs.PostView;
  isThreadAuthor: boolean;
}) {
  return (
    <>
      {isBotAccount(props.post.author) && <BotLabel />}
      {props.isThreadAuthor && (
        <Badge size="xs" variant="light" color="gray" flex="none">
          Author
        </Badge>
      )}
    </>
  );
}

function PostMeta(props: {
  post: AppBskyFeedDefs.PostView;
  postOrigin: string;
  isThreadAuthor: boolean;
  avatar?: boolean;
  light?: boolean;
}) {
  const nameWeight = props.light ? 600 : 700;
  const metaWeight = props.light ? 500 : undefined;
  const createdAt = postCreatedAt(props.post);
  const profileHref = `/profile/${props.post.author.handle}`;

  return (
    <Group
      gap={6}
      wrap="nowrap"
      miw={0}
      h={props.avatar ? TREE_AVATAR : undefined}
    >
      {props.avatar && (
        <Avatar
          component="a"
          href={profileHref}
          src={props.post.author.avatar?.replace('avatar', 'avatar_thumbnail')}
          alt={`${props.post.author.handle} avatar`}
          radius="xl"
          size={TREE_AVATAR}
          className={classes.avatar}
        />
      )}
      <LinkText
        href={profileHref}
        c="bright"
        fw={nameWeight}
        fz="md"
        lineClamp={1}
        miw={0}
        maw="50%"
      >
        {props.post.author.displayName || props.post.author.handle}
      </LinkText>
      <LinkText
        href={profileHref}
        c="gray"
        fw={metaWeight}
        fz="md"
        lineClamp={1}
        miw={0}
        // Shrink weight so the handle gives way before the name does
        style={{ flexShrink: 100 }}
      >
        @{props.post.author.handle}
      </LinkText>
      <Tooltip label={getFormattedDate(createdAt)}>
        <Anchor
          href={getPostUrl(props.post, props.postOrigin)}
          target="_blank"
          c="gray"
          fw={metaWeight}
          fz="md"
          underline="never"
          flex="none"
        >
          · {getRelativeTime(createdAt)}
        </Anchor>
      </Tooltip>
      <AuthorBadges post={props.post} isThreadAuthor={props.isThreadAuthor} />
    </Group>
  );
}

function PostContent(props: {
  post: AppBskyFeedDefs.PostView;
  fontSize: number;
  bubble?: boolean;
}) {
  const record = props.post.record as AppBskyFeedPost.Record;
  const moderation = getPostModerationUI(props.post, 'contentView');
  const text = record.text && (
    <RichTextRenderer
      text={record.text}
      facets={record.facets}
      textProps={{ c: 'bright', fz: `${props.fontSize}px`, lh: 1.5 }}
    />
  );

  return (
    <ContentHider
      blur={moderation.blur}
      noOverride={moderation.noOverride}
      reason={getModerationReasonText(moderation)}
    >
      <Stack gap="xs">
        {record.text &&
          (props.bubble ? (
            <Paper
              radius="lg"
              px="sm"
              py="xs"
              w="fit-content"
              maw="100%"
              bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
            >
              {text}
            </Paper>
          ) : (
            text
          ))}
        {props.post.embed && <PostEmbed embed={props.post.embed} />}
      </Stack>
    </ContentHider>
  );
}

interface PostProps {
  post: AppBskyFeedDefs.PostView;
  postOrigin: string;
  fontSize: number;
  isThreadAuthor: boolean;
  highlighted: boolean;
}

/** The thread's root, drawn like the post on its semble page */
export function ThreadAnchorPost(props: PostProps) {
  return (
    <Box
      data-post-uri={props.post.uri}
      className={classes.post}
      data-highlighted={props.highlighted || undefined}
      py="md"
    >
      <BlueskySemblePostCard
        post={props.post}
        url={getPostUrl(props.post, props.postOrigin)}
        textProps={{ fz: `${props.fontSize}px`, lh: 1.5 }}
      />
    </Box>
  );
}

/** List view row: avatar column joined to its parent and child by a line */
export function ThreadLinearPost(
  props: PostProps & {
    parentLine: boolean;
    childLine: boolean;
    replyingTo?: string;
    footer?: ReactNode;
  },
) {
  return (
    <Box
      data-post-uri={props.post.uri}
      className={classes.post}
      data-highlighted={props.highlighted || undefined}
    >
      <Group h={12} w={LINEAR_AVATAR} justify="center" align="flex-start">
        {props.parentLine && <Box w={2} h={8} bg={THREAD_LINE} />}
      </Group>
      <Group gap="xs" wrap="nowrap" align="stretch">
        <Stack w={LINEAR_AVATAR} flex="none" gap={0} align="center">
          <Avatar
            component="a"
            href={`/profile/${props.post.author.handle}`}
            src={props.post.author.avatar?.replace(
              'avatar',
              'avatar_thumbnail',
            )}
            alt={`${props.post.author.handle} avatar`}
            radius="xl"
            size={LINEAR_AVATAR}
            className={classes.avatar}
          />
          {props.childLine && <Box w={2} flex={1} mt={4} bg={THREAD_LINE} />}
        </Stack>
        <Stack gap="xxs" flex={1} miw={0} pb={props.childLine ? 0 : 'lg'}>
          <PostMeta
            post={props.post}
            postOrigin={props.postOrigin}
            isThreadAuthor={props.isThreadAuthor}
            light
          />
          {props.replyingTo && (
            <Group gap={4} wrap="nowrap" c="gray" miw={0}>
              <TbCornerDownRight size={14} strokeWidth={(1.75 * 24) / 14} />
              <Text fz="sm" fw={500} inherit lineClamp={1}>
                Replying to{' '}
                <LinkText
                  href={`/profile/${props.replyingTo}`}
                  inherit
                  c="gray"
                  span
                >
                  @{props.replyingTo}
                </LinkText>
              </Text>
            </Group>
          )}
          <PostContent post={props.post} fontSize={props.fontSize} bubble />
          {props.footer}
        </Stack>
      </Group>
    </Box>
  );
}

/** Tree view reply: small avatar inline with the name */
export function ThreadTreePost(props: PostProps & { childLine: boolean }) {
  return (
    <Box
      data-post-uri={props.post.uri}
      className={classes.treePost}
      data-highlighted={props.highlighted || undefined}
    >
      <PostMeta
        post={props.post}
        postOrigin={props.postOrigin}
        isThreadAuthor={props.isThreadAuthor}
        avatar
      />
      <Group gap={0} wrap="nowrap" align="stretch">
        <Box pos="relative" w={28} flex="none">
          {props.childLine && (
            <Box
              pos="absolute"
              left={11}
              top={4}
              bottom={0}
              w={2}
              bg={THREAD_LINE}
            />
          )}
        </Box>
        <Stack gap="xs" flex={1} miw={0} pt={4} pb="xs">
          <PostContent post={props.post} fontSize={props.fontSize} />
        </Stack>
      </Group>
    </Box>
  );
}
