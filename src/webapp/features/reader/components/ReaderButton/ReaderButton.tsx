'use client';

import { useState } from 'react';
import { Button } from '@mantine/core';
import { RiArticleLine } from 'react-icons/ri';
import useReaderContent from '../../lib/queries/useReaderContent';
import useReaderLinks from '../../lib/useReaderLinks';
import ReaderArticle from '../ReaderArticle/ReaderArticle';
import ReaderShell, { type ReaderBodyProps } from '../ReaderShell/ReaderShell';
import { DEFAULT_READER_SETTINGS } from '../ReaderTextSettings/ReaderTextSettings';
import BlueskyThreadReader from '@/features/platforms/bluesky/container/blueskyThreadReader/BlueskyThreadReader';
import { trackSembleAction } from '@/features/semble/lib/analytics';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';

interface Props {
  url: string;
}

function ArticleReader(props: ReaderBodyProps) {
  const reader = useReaderContent({ url: props.url, enabled: props.opened });

  // Extracted from the original content so the list keeps working while
  // the show-links toggle is off
  const links = useReaderLinks(reader.data?.content ?? '', props.url);

  return (
    <ReaderShell
      {...props}
      links={links}
      linkCount={reader.isPending ? undefined : links.length}
    >
      <ReaderArticle
        reader={reader}
        settings={props.settings}
        articleUrl={props.url}
      />
    </ReaderShell>
  );
}

const THREAD_PLATFORMS = new Set([
  SupportedPlatform.BLUESKY_POST,
  SupportedPlatform.BLACKSKY_POST,
]);

export default function ReaderButton(props: Props) {
  const [opened, setOpened] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_READER_SETTINGS);
  // Readability can't read bsky.app, a client-rendered shell
  const isThread = THREAD_PLATFORMS.has(detectUrlPlatform(props.url).type);
  const Body = isThread ? BlueskyThreadReader : ArticleReader;

  return (
    <>
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

      <Body
        url={props.url}
        opened={opened}
        onClose={() => setOpened(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}
