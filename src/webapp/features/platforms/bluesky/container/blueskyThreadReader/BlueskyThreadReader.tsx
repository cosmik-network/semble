'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { MdErrorOutline } from 'react-icons/md';
import ReaderShell, {
  type ReaderBodyProps,
} from '@/features/reader/components/ReaderShell/ReaderShell';
import type { ReaderWidth } from '@/features/reader/components/ReaderTextSettings/ReaderTextSettings';
import { useScrollFade } from '@/hooks/useScrollFade';
import { useSettings } from '@/providers/settings';
import useBlueskyThread from '../../lib/queries/useBlueskyThread';
import {
  buildThreadView,
  extractThreadLinks,
  flattenThread,
  isHiddenFromLoggedOut,
  postOriginOf,
  type ThreadIndex,
} from '../../lib/thread';
import { ThreadTombstone } from '../../components/threadPost/ThreadPost';
import {
  ShowHiddenReplies,
  ThreadList,
  ThreadTree,
  type ThreadRenderContext,
} from '../../components/threadTree/ThreadTree';
import ThreadViewControls from '../../components/threadViewControls/ThreadViewControls';

function ancestorsOf(index: ThreadIndex, uri: string | null): Set<string> {
  const path = new Set<string>();
  let current = uri ? index.entries.get(uri) : undefined;
  while (current && !path.has(current.uri)) {
    path.add(current.uri);
    current = current.parentUri
      ? index.entries.get(current.parentUri)
      : undefined;
  }
  return path;
}

function ThreadLoading() {
  return (
    <Stack align="center" gap="sm" py="xl" role="status">
      <Loader type="dots" color="gray" />
      <Text c="gray" fw={500}>
        Loading thread…
      </Text>
    </Stack>
  );
}

const EMPTY_SET: ReadonlySet<string> = new Set();

// Narrower than the article reader's 540/720/960
const THREAD_WIDTH: Record<ReaderWidth, number> = {
  narrow: 510,
  cozy: 660,
  wide: 880,
};

export default function BlueskyThreadReader(props: ReaderBodyProps) {
  const { settings: userSettings, updateSetting } = useSettings();
  const thread = useBlueskyThread({ url: props.url, enabled: props.opened });
  const { query, index, hiddenUris } = thread;
  const data = query.data;

  const [showHidden, setShowHidden] = useState(false);
  const [focus, setFocus] = useState<{ uri: string; at: number } | null>(null);
  // Forget the jump target when the reader closes
  const [wasOpened, setWasOpened] = useState(props.opened);
  if (props.opened !== wasOpened) {
    setWasOpened(props.opened);
    if (!props.opened) setFocus(null);
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const { setViewport, maskImage, updateFade } = useScrollFade();

  // Only the saved reply is highlighted; a jump just scrolls
  const savedUri =
    data && data.anchorUri !== data.rootUri ? data.anchorUri : null;
  const focusedUri = focus?.uri ?? savedUri;

  const revealPath = useMemo(() => {
    if (!index) return EMPTY_SET;
    const path = ancestorsOf(index, savedUri);
    ancestorsOf(index, focus?.uri ?? null).forEach((uri) => path.add(uri));
    return path;
  }, [index, savedUri, focus?.uri]);
  const hiddenShown =
    showHidden || Array.from(revealPath).some((uri) => hiddenUris.has(uri));

  const view = useMemo(
    () => (index ? buildThreadView(index, { hiddenUris }) : null),
    [index, hiddenUris],
  );
  const listItems = useMemo(
    () => (view && index ? flattenThread(view, index, hiddenShown) : []),
    [view, index, hiddenShown],
  );

  const rootEntry = index?.entries.get(index.rootUri);
  const rootPost = rootEntry?.kind === 'post' ? rootEntry.post : undefined;
  const rootOptedOut = !!rootPost && isHiddenFromLoggedOut(rootPost);

  const links = useMemo(
    () =>
      rootOptedOut
        ? []
        : extractThreadLinks(
            listItems.flatMap((item) =>
              item.node.entry.kind === 'post' ? [item.node.entry.post] : [],
            ),
            props.url,
          ),
    [listItems, rootOptedOut, props.url],
  );
  const partiallyLoaded = listItems.some((item) => item.node.hasMore);

  const hasIndex = index !== null;
  useEffect(() => {
    if (!props.opened || !hasIndex || !focusedUri) return;
    const frame = requestAnimationFrame(() => {
      contentRef.current
        ?.querySelector(`[data-post-uri="${CSS.escape(focusedUri)}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [props.opened, hasIndex, focusedUri, focus?.at, userSettings.threadView]);

  const ctx: ThreadRenderContext = {
    rootAuthorDid: rootPost?.author.did,
    postOrigin: postOriginOf(props.url),
    fontSize: props.settings.fontSize,
    highlightedUri: savedUri,
    revealPath,
    loading: thread.loading,
    failed: thread.failed,
    onLoadMore: thread.loadMore,
  };

  const hiddenCount = view?.hidden.length ?? 0;

  return (
    <ReaderShell
      {...props}
      links={links}
      linkCount={query.isPending ? undefined : links.length}
      linksTitle={
        partiallyLoaded ? 'Links from loaded posts' : 'Links in this thread'
      }
      emptyLinksLabel="No links found in this thread"
      showLinksOption={false}
      onShowLinkSource={(uri) => setFocus({ uri, at: Date.now() })}
      toolbarControls={
        <ThreadViewControls
          view={userSettings.threadView}
          onViewChange={(value) => updateSetting('threadView', value)}
        />
      }
    >
      <ScrollArea
        style={{ flex: 1 }}
        viewportRef={setViewport}
        onScrollPositionChange={updateFade}
        styles={{
          viewport: maskImage
            ? { maskImage, WebkitMaskImage: maskImage }
            : undefined,
        }}
      >
        <Container
          ref={contentRef}
          size={THREAD_WIDTH[props.settings.width]}
          px={0}
          style={{
            paddingTop: '2.5rem',
            paddingBottom: '7rem',
            transition: 'max-width 0.25s ease',
          }}
        >
          <Box px="md">
            {query.isPending && <ThreadLoading />}

            {query.isError && (
              <Stack gap="md">
                <Alert
                  icon={<MdErrorOutline size={20} />}
                  title="Could not load thread"
                  color="red"
                  variant="light"
                >
                  {query.error.message}
                </Alert>
                <Button
                  variant="default"
                  size="sm"
                  radius="xl"
                  onClick={() => query.refetch()}
                >
                  Try again
                </Button>
              </Stack>
            )}

            {query.isSuccess && !data && (
              <ThreadTombstone uri={props.url} kind="notFound" />
            )}

            {rootOptedOut && rootPost && (
              <ThreadTombstone
                uri={rootPost.uri}
                kind="loggedOut"
                href={props.url}
              />
            )}
          </Box>

          {!rootOptedOut && view?.root && index && (
            <>
              {userSettings.threadView === 'list' ? (
                <ThreadList items={listItems} index={index} ctx={ctx} />
              ) : (
                <ThreadTree
                  root={view.root}
                  extra={hiddenShown ? view.hidden : undefined}
                  ctx={ctx}
                />
              )}

              {hiddenCount > 0 && !hiddenShown && (
                <ShowHiddenReplies
                  count={hiddenCount}
                  onClick={() => setShowHidden(true)}
                />
              )}
            </>
          )}
        </Container>
      </ScrollArea>
    </ReaderShell>
  );
}
