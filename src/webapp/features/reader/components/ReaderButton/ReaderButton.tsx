'use client';

import { useState } from 'react';
import { Button, Drawer } from '@mantine/core';
import { TbBook2 } from 'react-icons/tb';
import useReaderContent from '../../lib/queries/useReaderContent';
import useReaderLinks from '../../lib/useReaderLinks';
import ReaderArticle from '../ReaderArticle/ReaderArticle';
import ReaderToolbar from '../ReaderToolbar/ReaderToolbar';
import ReaderLinksDrawer from '../ReaderLinksDrawer/ReaderLinksDrawer';
import { DEFAULT_READER_SETTINGS } from '../ReaderTextSettings/ReaderTextSettings';

interface Props {
  url: string;
}

export default function ReaderButton(props: Props) {
  const [opened, setOpened] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_READER_SETTINGS);

  const reader = useReaderContent({ url: props.url, enabled: opened });

  // Extracted from the original content so the list keeps working while
  // the show-links toggle is off
  const links = useReaderLinks(reader.data?.content ?? '', props.url);

  return (
    <>
      <Button
        variant="light"
        color="gray"
        radius="xl"
        leftSection={<TbBook2 size={18} />}
        onClick={() => setOpened(true)}
        aria-label="Open reader mode"
      >
        Reader
      </Button>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="bottom"
        size="full"
        p={0}
        withCloseButton={false}
        // While the links drawer is stacked on top, Esc should only close it,
        // not this drawer underneath
        closeOnEscape={!linksOpen}
        styles={{
          content: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          },
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <ReaderArticle reader={reader} settings={settings} />

        <ReaderToolbar
          settings={settings}
          onSettingsChange={setSettings}
          linkCount={reader.data ? links.length : undefined}
          onOpenLinks={() => setLinksOpen(true)}
          onClose={() => setOpened(false)}
        />
      </Drawer>

      <ReaderLinksDrawer
        opened={linksOpen}
        onClose={() => setLinksOpen(false)}
        links={links}
        articleUrl={props.url}
      />
    </>
  );
}
