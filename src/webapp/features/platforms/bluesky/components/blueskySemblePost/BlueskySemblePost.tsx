import { AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api';
import { getBlueskyPost } from '../../lib/dal';
import SembleHeader from '@/features/semble/components/SembleHeader/SembleHeader';
import { getPostUriFromUrl } from '@/lib/utils/atproto';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import {
  detectUrlPlatform,
  getDomain,
  SupportedPlatform,
} from '@/lib/utils/link';
import { getFormattedDate } from '@/lib/utils/time';
import {
  Stack,
  Tooltip,
  Anchor,
  Card,
  Group,
  Avatar,
  Box,
  Image,
  Text,
  Badge,
} from '@mantine/core';
import Link from 'next/link';
import { FaBluesky } from 'react-icons/fa6';
import PostEmbed from '../postEmbed/PostEmbed';
import BlackskyLogo from '@/assets/icons/blacksky-logo.svg';
import BlackskyLogoWhite from '@/assets/icons/blacksky-logo-white.svg';
import { RiArrowRightUpLine } from 'react-icons/ri';
import { UrlType } from '@semble/types';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { IconType } from 'react-icons/lib';
import { getUrlMetadata } from '@/features/cards/lib/dal';

interface Props {
  url: string;
}

export default async function BlueskySemblePost(props: Props) {
  const postUri = getPostUriFromUrl(props.url);
  const data = await getBlueskyPost(postUri);
  const { metadata } = await getUrlMetadata(props.url);
  const urlTypeIcon = getUrlTypeIcon(metadata.type as UrlType);
  const IconComponent = urlTypeIcon as IconType;

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
    AppBskyFeedDefs.isBlockedPost(data.thread.post)
  ) {
    // fallback
    return <SembleHeader url={props.url} />;
  }

  const post = data.thread.post;
  const record = post.record as AppBskyFeedPost.Record;

  return (
    <Stack gap={'xs'}>
      <Group gap={'xs'}>
        <Badge size="xs" color="lime" leftSection={<IconComponent />}>
          {UrlType.SOCIAL}
        </Badge>
        <Tooltip label={props.url}>
          <Anchor
            component={Link}
            target="_blank"
            fw={700}
            c="blue"
            href={props.url}
            style={{ display: 'inline-block' }}
          >
            <Group gap={0} align="center" wrap="nowrap">
              {getDomain(props.url)}
              <RiArrowRightUpLine />
            </Group>
          </Anchor>
        </Tooltip>
      </Group>

      {/* Post */}
      <Card radius={'lg'} withBorder>
        <Stack gap={'xs'}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap={'xs'} wrap="nowrap">
              <Avatar
                src={post.author.avatar?.replace('avatar', 'avatar_thumbnail')}
                alt={`${post.author.handle} social preview image`}
                radius="xl"
              />
              <Stack gap={0} flex={1}>
                <Text c="bright" lineClamp={1} fw={500} w="fit-content">
                  {post.author.displayName || post.author.handle}
                </Text>
                <Text c="gray" lineClamp={1} w="fit-content">
                  @{post.author.handle}
                </Text>
              </Stack>
            </Group>
            {platformIcon}
          </Group>
          <Stack gap={'xs'} w={'100%'}>
            <Box>
              <RichTextRenderer
                text={record.text}
                textProps={{ c: 'bright' }}
              />
            </Box>
            {post.embed && <PostEmbed embed={post.embed} />}
          </Stack>
          <Text c={'gray'} fz={'sm'} fw={500}>
            {getFormattedDate(post.indexedAt)}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
