'use client';

import {
  Avatar,
  Button,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { TbCornerLeftUp } from 'react-icons/tb';
import { useMediaQuery } from '@mantine/hooks';
import { getDomain } from '@/lib/utils/link';
import { useScrollFade } from '@/hooks/useScrollFade';
import ReaderLinkCard from '../ReaderLinkCard/ReaderLinkCard';
import type { ReaderLink } from '../../lib/useReaderLinks';

interface Props {
  opened: boolean;
  onClose: () => void;
  links: ReaderLink[];
  articleUrl: string;
  title?: string;
  /** Lets a link credited to posts jump back to the first of them */
  onShowSource?: (postUri: string) => void;
}

const MAX_CREDITS = 5;

// Same inset edge as the thread view's avatars
const AVATAR_EDGE = {
  outline: '1px solid light-dark(oklch(0 0 0 / 0.1), oklch(1 0 0 / 0.1))',
  outlineOffset: -1,
};

function Credits(props: {
  sources: NonNullable<ReaderLink['sources']>;
  onShowSource?: (postUri: string) => void;
}) {
  const shown = props.sources.slice(0, MAX_CREDITS);
  const rest = props.sources.length - shown.length;
  const first = props.sources[0];

  return (
    <Group justify="space-between" gap="xs" wrap="nowrap" px={4}>
      <Avatar.Group spacing={8} flex="none">
        {shown.map((s) => (
          <Tooltip key={s.handle} label={`@${s.handle}`}>
            <Avatar
              src={s.avatar}
              alt={`@${s.handle}`}
              radius="xl"
              size={24}
              style={AVATAR_EDGE}
            />
          </Tooltip>
        ))}
        {rest > 0 && (
          <Avatar radius="xl" size={24} fz={10}>
            +{rest}
          </Avatar>
        )}
      </Avatar.Group>
      {props.onShowSource && first && (
        <Button
          variant="light"
          color="gray"
          size="compact-xs"
          radius="xl"
          leftSection={<TbCornerLeftUp size={14} />}
          onClick={() => props.onShowSource?.(first.postUri)}
        >
          Show in thread
        </Button>
      )}
    </Group>
  );
}

export default function ReaderLinksDrawer(props: Props) {
  const isDesktop = useMediaQuery('(min-width: 48em)', false);
  const { setViewport, maskImage, updateFade } = useScrollFade();
  const credited = props.links.some((l) => l.sources?.length);

  return (
    <Drawer
      opened={props.opened}
      onClose={props.onClose}
      position={isDesktop ? 'right' : 'bottom'}
      size={isDesktop ? 'md' : '80%'}
      radius={0}
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      title={
        <Stack gap={0}>
          <Text fw={600}>{props.title ?? 'Links on this page'}</Text>
          <Text fw={500} size="xs" c="gray">
            {getDomain(props.articleUrl)}
          </Text>
        </Stack>
      }
    >
      {props.links.length === 0 ? (
        <Text c="dimmed" py="md">
          No links found on this page.
        </Text>
      ) : (
        <ScrollArea
          type="auto"
          style={{ flex: 1, minHeight: 0 }}
          viewportRef={setViewport}
          onScrollPositionChange={updateFade}
          styles={{
            viewport: maskImage
              ? { maskImage, WebkitMaskImage: maskImage }
              : undefined,
          }}
        >
          <Stack gap={credited ? 'lg' : 'xs'} pb="md">
            {props.links.map((link) =>
              link.sources?.length ? (
                <Stack key={link.href} gap={6}>
                  <ReaderLinkCard link={link} articleUrl={props.articleUrl} />
                  <Credits
                    sources={link.sources}
                    onShowSource={props.onShowSource}
                  />
                </Stack>
              ) : (
                <ReaderLinkCard
                  key={link.href}
                  link={link}
                  articleUrl={props.articleUrl}
                />
              ),
            )}
          </Stack>
        </ScrollArea>
      )}
    </Drawer>
  );
}
