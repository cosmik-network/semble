'use client';

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { FaSeedling } from 'react-icons/fa6';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import {
  stopEventPropagation,
  useEditor,
  useValue,
  type TLShapeId,
} from 'tldraw';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { getRelativeTime } from '@/lib/utils/time';
import {
  FRAME_DESCRIPTION_LINES,
  FRAME_DESCRIPTION_WIDTH,
  FRAME_FOOTER_HEIGHT,
  FRAME_PADDING,
  HEADER_DESCRIPTION_MARGIN,
  HEADER_LABEL_HEIGHT,
  HEADER_PADDING,
  HEADER_STATS_HEIGHT,
  HEADER_STATS_MARGIN,
  HEADER_TITLE_HEIGHT,
  frameFooter,
  isCollapsed,
  type CollectionFrameMeta,
} from '../../model/collectionFrames';
import { useCollectionFrames } from '../../lib/canvasCollectionFramesContext';
import classes from './CollectionFrameFace.module.css';

interface Props {
  id: TLShapeId;
  w: number;
  h: number;
  meta: CollectionFrameMeta;
  radius: number;
}

export default function CollectionFrameFace(props: Props) {
  const editor = useEditor();
  const collectionFrames = useCollectionFrames();
  const readonly = useValue('readonly', () => editor.getIsReadonly(), [editor]);
  const loadingMore = useValue(
    'loading more',
    () => collectionFrames?.isLoadingMore(props.id) ?? false,
    [collectionFrames, props.id],
  );
  const collection = props.meta.collection;
  const footer = frameFooter(props.meta);
  const collapsed = isCollapsed(props.meta);
  const collapseLabel = collapsed ? 'Expand' : 'Collapse';

  return (
    <Box
      className={classes.root}
      data-open={collection.open || undefined}
      data-collapsed={collapsed || undefined}
      w={props.w}
      h={props.h}
      style={{ '--frame-radius': `${props.radius}px` }}
    >
      <Stack
        className={classes.header}
        gap={0}
        h={props.meta.headerHeight}
        px={FRAME_PADDING}
        py={HEADER_PADDING}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={0} miw={0}>
            <Group gap="xs" h={HEADER_LABEL_HEIGHT} wrap="nowrap">
              <Text fw={700} c={collection.open ? 'green' : 'grape'}>
                Collection
              </Text>
              {collection.open && (
                <Badge
                  color="green"
                  variant="light"
                  leftSection={<FaSeedling />}
                >
                  Open
                </Badge>
              )}
            </Group>
            <Title order={3} h={HEADER_TITLE_HEIGHT} lineClamp={1}>
              {collection.name}
            </Title>
          </Stack>
          <Group gap="sm" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Avatar
                size={32}
                src={collection.author.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${collection.author.name}'s avatar`}
              />
              <Stack gap={0}>
                <Text fw={600} fz="sm" c="bright" lh={1.3} lineClamp={1}>
                  {collection.author.name || `@${collection.author.handle}`}
                </Text>
                <Text fz="sm" fw={500} c="gray" lh={1.3}>
                  Updated {getRelativeTime(collection.updatedAt)}
                </Text>
              </Stack>
            </Group>
            <Tooltip label={collapseLabel} withArrow>
              <ActionIcon
                className={classes.control}
                variant="subtle"
                color="gray"
                radius="xl"
                aria-label={collapseLabel}
                disabled={readonly}
                onPointerDown={stopEventPropagation}
                onClick={() => collectionFrames?.toggleCollapsed(props.id)}
              >
                {collapsed ? <LuChevronDown /> : <LuChevronUp />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        {collection.description?.trim() && (
          <Box mt={HEADER_DESCRIPTION_MARGIN} maw={FRAME_DESCRIPTION_WIDTH}>
            <RichTextRenderer
              text={collection.description}
              textProps={{
                fz: 'sm',
                c: 'gray',
                lh: 1.55,
                lineClamp: FRAME_DESCRIPTION_LINES,
              }}
            />
          </Box>
        )}
        <Text
          fz="sm"
          fw={500}
          c="gray"
          h={HEADER_STATS_HEIGHT}
          mt={HEADER_STATS_MARGIN}
        >
          {collection.cardCount} {collection.cardCount === 1 ? 'card' : 'cards'}
        </Text>
      </Stack>
      {!collapsed && (
        <Group
          pos="absolute"
          bottom={0}
          left={0}
          right={0}
          h={FRAME_FOOTER_HEIGHT}
          justify="center"
          gap="sm"
        >
          <Text
            c="dimmed"
            fz="sm"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {footer.shown} of {footer.total}
          </Text>
          {footer.canLoadMore && !readonly && (
            <Button
              className={classes.control}
              variant="default"
              radius="xl"
              size="compact-sm"
              loading={loadingMore}
              onPointerDown={stopEventPropagation}
              onClick={() => collectionFrames?.loadMore(props.id)}
            >
              Load more
            </Button>
          )}
        </Group>
      )}
    </Box>
  );
}
