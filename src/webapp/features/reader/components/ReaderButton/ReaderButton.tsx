'use client';

import { useState } from 'react';
import { Button, Drawer } from '@mantine/core';
import { useWindowEvent } from '@mantine/hooks';
import { RiArticleLine } from 'react-icons/ri';
import useReaderContent from '../../lib/queries/useReaderContent';
import useReaderLinks from '../../lib/useReaderLinks';
import {
  ReaderLinkProvider,
  useReaderLinkReducer,
} from '../../lib/readerLinkState';
import ReaderArticle from '../ReaderArticle/ReaderArticle';
import ReaderToolbar from '../ReaderToolbar/ReaderToolbar';
import ReaderLinksDrawer from '../ReaderLinksDrawer/ReaderLinksDrawer';
import { DEFAULT_READER_SETTINGS } from '../ReaderTextSettings/ReaderTextSettings';
import { trackSembleAction } from '@/features/semble/lib/analytics';
import { useSembleNavigation } from '@/features/semble/lib/sembleNavigation';

interface Props {
  url: string;
}

export default function ReaderButton(props: Props) {
  const [opened, setOpened] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_READER_SETTINGS);
  const [linkState, dispatchLink] = useReaderLinkReducer();
  // Hide while following a link so the page skeleton shows; the reader
  // remounts on the new page
  const isNavigating = useSembleNavigation()?.isNavigating;

  const reader = useReaderContent({ url: props.url, enabled: opened });

  // Extracted from the original content so the list keeps working while
  // the show-links toggle is off
  const links = useReaderLinks(reader.data?.content ?? '', props.url);

  const closeReader = () => {
    setOpened(false);
    dispatchLink({ type: 'reset' });
  };

  // Popovers never hold focus, so Escape is handled here
  useWindowEvent('keydown', (e) => {
    if (e.key === 'Escape' && linkState.activeId !== null) {
      dispatchLink({ type: 'dismiss' });
    }
  });

  return (
    <ReaderLinkProvider state={linkState} dispatch={dispatchLink}>
      <Button
        variant="light"
        color="gray"
        radius="xl"
        leftSection={<RiArticleLine size={18} />}
        onClick={() => {
          setOpened(true);
          trackSembleAction(props.url, 'reader');
        }}
        aria-label="Open reader mode"
      >
        Reader
      </Button>

      <Drawer
        opened={opened && !isNavigating}
        onClose={closeReader}
        position="bottom"
        size="full"
        p={0}
        withCloseButton={false}
        // Esc should close only what is stacked on top
        closeOnEscape={!linksOpen && linkState.activeId === null}
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
        <ReaderArticle
          reader={reader}
          settings={settings}
          articleUrl={props.url}
        />

        <ReaderToolbar
          settings={settings}
          onSettingsChange={setSettings}
          linkCount={reader.isPending ? undefined : links.length}
          onOpenLinks={() => setLinksOpen(true)}
          onClose={closeReader}
        />
      </Drawer>

      <ReaderLinksDrawer
        opened={linksOpen && !isNavigating}
        onClose={() => setLinksOpen(false)}
        links={links}
        articleUrl={props.url}
      />
    </ReaderLinkProvider>
  );
}
