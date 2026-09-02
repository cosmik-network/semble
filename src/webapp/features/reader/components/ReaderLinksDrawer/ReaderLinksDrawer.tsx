'use client';

import { Drawer, ScrollArea, Stack, Text } from '@mantine/core';
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
}

export default function ReaderLinksDrawer(props: Props) {
  const isDesktop = useMediaQuery('(min-width: 48em)', false);
  const { setViewport, maskImage, updateFade } = useScrollFade();

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
          <Text fw={600}>Links on this page</Text>
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
          <Stack gap="xs" pb="md">
            {props.links.map((link) => (
              <ReaderLinkCard
                key={link.href}
                link={link}
                articleUrl={props.articleUrl}
              />
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Drawer>
  );
}
