'use client';

import { useRef, useState } from 'react';
import {
  ActionIcon,
  Drawer,
  Tooltip,
  Stack,
  Title,
  Text,
  Alert,
  ScrollArea,
  Box,
  Group,
  CloseButton,
  Skeleton,
  Button,
  Badge,
  Container,
  Divider,
  Popover,
} from '@mantine/core';
import { TbBook2, TbExternalLink, TbLink } from 'react-icons/tb';
import { MdErrorOutline } from 'react-icons/md';
import {
  fetchReaderContent,
  type ReaderState,
} from '../../lib/fetchReaderContent';
import useReaderLinks, { type ReaderLink } from '../../lib/useReaderLinks';
import useLinkInteractions from '../../lib/useLinkInteractions';
import LinkActionsPopover from '../LinkActionsPopover/LinkActionsPopover';
import LinkActionsSheet from '../LinkActionsSheet/LinkActionsSheet';
import ReaderLinksDrawer from '../ReaderLinksDrawer/ReaderLinksDrawer';
import ReaderTextSettings from '../ReaderTextSettings/ReaderTextSettings';
import { getDomain } from '@/lib/utils/link';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import styles from './ReaderButton.module.css';

interface Props {
  url: string;
}

const FONT_SIZE_DEFAULT = 17;

function ArticleSkeleton() {
  return (
    <Stack gap="sm">
      <Skeleton height={12} width="15%" radius="sm" />
      <Skeleton height={36} width="90%" radius="sm" />
      <Skeleton height={36} width="70%" radius="sm" />
      <Skeleton height={12} width="25%" radius="sm" mt={4} />
      <Box mt="xl">
        {[100, 95, 88, 100, 92, 78, 100, 96, 83, 60].map((w, i) => (
          <Skeleton key={i} height={14} width={`${w}%`} radius="sm" mb={10} />
        ))}
      </Box>
      <Box mt="xs">
        {[100, 91, 100, 85, 100, 72].map((w, i) => (
          <Skeleton key={i} height={14} width={`${w}%`} radius="sm" mb={10} />
        ))}
      </Box>
    </Stack>
  );
}

export default function ReaderButton({ url }: Props) {
  const [opened, setOpened] = useState(false);
  const [linksDrawerOpen, setLinksDrawerOpen] = useState(false);
  const [state, setState] = useState<ReaderState>({ status: 'idle' });
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [removeLinks, setRemoveLinks] = useState(false);
  const [wide, setWide] = useState(false);
  const [textSettingsOpen, setTextSettingsOpen] = useState(false);
  const [saveLink, setSaveLink] = useState<ReaderLink | null>(null);
  const [connectLink, setConnectLink] = useState<ReaderLink | null>(null);

  const articleRef = useRef<HTMLDivElement>(null);

  const displayedHtml =
    state.status === 'success'
      ? removeLinks
        ? state.data.content.replace(/<a[^>]*>([\s\S]*?)<\/a>/g, '$1')
        : state.data.content
      : '';

  // Extracted from the original content so the list keeps working while
  // the remove-links toggle is on
  const links = useReaderLinks(
    state.status === 'success' ? state.data.content : '',
    url,
  );

  const {
    hovered,
    cancelHoverClose,
    scheduleHoverClose,
    closeHover,
    pressedLink,
    clearPressedLink,
  } = useLinkInteractions(articleRef, displayedHtml);

  function handleSaveLink(link: ReaderLink) {
    closeHover();
    clearPressedLink();
    setLinksDrawerOpen(false);
    setSaveLink(link);
  }

  function handleConnectLink(link: ReaderLink) {
    closeHover();
    clearPressedLink();
    setLinksDrawerOpen(false);
    setConnectLink(link);
  }

  function openReader() {
    setOpened(true);
    if (state.status === 'success' || state.status === 'loading') return;
    fetchReaderContent(url, setState);
  }

  function handleClose() {
    setOpened(false);
  }

  return (
    <>
      <Button
        variant="light"
        color="gray"
        radius="xl"
        leftSection={<TbBook2 size={18} />}
        onClick={openReader}
        aria-label="Open reader mode"
      >
        Reader
      </Button>

      <Drawer
        opened={opened}
        onClose={handleClose}
        position="bottom"
        size="full"
        padding={0}
        withCloseButton={false}
        // While the links drawer or a modal is stacked on top, Esc should only
        // close it, not this drawer underneath
        closeOnEscape={!linksDrawerOpen && !saveLink && !connectLink}
        styles={{
          content: { display: 'flex', flexDirection: 'column' },
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* ── Top bar ── */}
        <Group p="xs" justify="space-between" align="center">
          <Text size="sm" c="dimmed" fw={600}>
            {getDomain(url)}
          </Text>
          <CloseButton
            radius="xl"
            onClick={handleClose}
            aria-label="Close reader mode"
          />
        </Group>
        <Divider color="var(--mantine-color-default-border)" />

        {/* ── Scrollable article area ── */}
        <ScrollArea style={{ flex: 1 }}>
          <Container
            size={wide ? 'md' : 'sm'}
            px="xl"
            style={{
              paddingTop: '2.5rem',
              paddingBottom: '3rem',
              transition: 'max-width 0.25s ease',
            }}
          >
            {state.status === 'loading' && <ArticleSkeleton />}

            {state.status === 'error' && (
              <Stack gap="md">
                <Alert
                  icon={<MdErrorOutline size={20} />}
                  title="Could not load reader"
                  color="red"
                  variant="light"
                >
                  {state.message}
                </Alert>
                <Button
                  variant="default"
                  size="sm"
                  radius="xl"
                  onClick={() => fetchReaderContent(url, setState)}
                >
                  Try again
                </Button>
              </Stack>
            )}

            {state.status === 'success' && (
              <Stack gap="xs">
                {state.data.siteName && (
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {state.data.siteName}
                  </Text>
                )}

                {state.data.title && (
                  <Title
                    order={1}
                    style={{ lineHeight: 1.2, fontSize: '1.75rem' }}
                  >
                    {state.data.title}
                  </Title>
                )}

                {state.data.byline && (
                  <Text size="sm" c="dimmed" mt={2}>
                    {state.data.byline}
                  </Text>
                )}

                <Box
                  component="article"
                  ref={articleRef}
                  dangerouslySetInnerHTML={{ __html: displayedHtml }}
                  className={styles.readerContent}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.8,
                    color: 'var(--mantine-color-text)',
                    marginTop: '1.5rem',
                  }}
                />
              </Stack>
            )}
          </Container>
        </ScrollArea>

        {hovered && (
          <LinkActionsPopover
            hovered={hovered}
            onSave={() => handleSaveLink(hovered.link)}
            onConnect={() => handleConnectLink(hovered.link)}
            onMouseEnter={cancelHoverClose}
            onMouseLeave={scheduleHoverClose}
          />
        )}

        {/* ── Sticky bottom bar ── */}
        <Divider color="var(--mantine-color-default-border)" />
        <Group p={'xs'} gap="xs" justify="space-between" align="center">
          <Group gap="xs">
            <Popover
              opened={textSettingsOpen}
              onChange={setTextSettingsOpen}
              position="top-start"
              radius="lg"
              shadow="md"
              width={300}
              withinPortal={false}
            >
              <Popover.Target>
                <Button
                  variant={textSettingsOpen ? 'inverse' : 'light'}
                  color="gray"
                  size="sm"
                  radius="xl"
                  leftSection={
                    <Text component="span" fw={700}>
                      Aa
                    </Text>
                  }
                  onClick={() => setTextSettingsOpen((o) => !o)}
                  aria-label="Text settings"
                >
                  Text
                </Button>
              </Popover.Target>
              <ReaderTextSettings
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                wide={wide}
                onWideChange={setWide}
                showLinks={!removeLinks}
                onShowLinksChange={(show) => setRemoveLinks(!show)}
              />
            </Popover>

            {state.status === 'success' && (
              <Button
                variant="light"
                color="gray"
                size="sm"
                radius="xl"
                leftSection={<TbLink size={16} />}
                rightSection={
                  <Badge size="xs" variant="filled" color="gray">
                    {links.length}
                  </Badge>
                }
                onClick={() => setLinksDrawerOpen(true)}
                aria-label="View all links"
              >
                Links
              </Button>
            )}
          </Group>
          <Tooltip label="Open original" withArrow position="top">
            <ActionIcon
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              color="gray"
              size="lg"
              radius="xl"
              aria-label="Open original"
            >
              <TbExternalLink size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <LinkActionsSheet
          link={pressedLink}
          onClose={clearPressedLink}
          onSave={handleSaveLink}
          onConnect={handleConnectLink}
        />

        {saveLink && (
          <AddCardToModal
            isOpen
            onClose={() => setSaveLink(null)}
            url={saveLink.href}
            urlLibraryCount={0}
            zIndex={300}
          />
        )}

        <AddConnectionModal
          isOpen={!!connectLink}
          onClose={() => setConnectLink(null)}
          sourceUrl={url}
          targetUrl={connectLink?.href}
          defaultConnectionType="LEADS_TO"
          zIndex={300}
        />
      </Drawer>

      <ReaderLinksDrawer
        opened={linksDrawerOpen}
        onClose={() => setLinksDrawerOpen(false)}
        links={links}
        onSave={handleSaveLink}
        onConnect={handleConnectLink}
      />
    </>
  );
}
