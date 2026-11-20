'use client';

import { useState, type ReactNode } from 'react';
import { Drawer } from '@mantine/core';
import { useWindowEvent } from '@mantine/hooks';
import {
  ReaderLinkProvider,
  useReaderLinkReducer,
} from '../../lib/readerLinkState';
import type { ReaderLink } from '../../lib/useReaderLinks';
import ReaderToolbar from '../ReaderToolbar/ReaderToolbar';
import ReaderLinksDrawer from '../ReaderLinksDrawer/ReaderLinksDrawer';
import type { ReaderSettings } from '../ReaderTextSettings/ReaderTextSettings';
import { useSembleNavigation } from '@/features/semble/lib/sembleNavigation';

/** What the reader button hands whichever reader fits the URL */
export interface ReaderBodyProps {
  url: string;
  opened: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
}

interface Props extends ReaderBodyProps {
  links: ReaderLink[];
  /** Undefined while loading */
  linkCount?: number;
  linksTitle?: string;
  emptyLinksLabel?: string;
  showLinksOption?: boolean;
  toolbarControls?: ReactNode;
  onShowLinkSource?: (postUri: string) => void;
  children: ReactNode;
}

/** The reader drawer, its toolbar and links drawer, around any content. */
export default function ReaderShell(props: Props) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [linkState, dispatchLink] = useReaderLinkReducer();
  // Hide while following a link so the page skeleton shows; the reader
  // remounts on the new page
  const isNavigating = useSembleNavigation()?.isNavigating;

  const close = () => {
    props.onClose();
    dispatchLink({ type: 'reset' });
  };

  // Popovers never hold focus, so Escape is handled here
  useWindowEvent('keydown', (e) => {
    if (e.key === 'Escape' && linkState.activeId !== null) {
      dispatchLink({ type: 'dismiss' });
    }
  });

  const onShowLinkSource = props.onShowLinkSource;

  return (
    <ReaderLinkProvider state={linkState} dispatch={dispatchLink}>
      <Drawer
        opened={props.opened && !isNavigating}
        onClose={close}
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
        {props.children}

        <ReaderToolbar
          settings={props.settings}
          onSettingsChange={props.onSettingsChange}
          linkCount={props.linkCount}
          onOpenLinks={() => setLinksOpen(true)}
          onClose={close}
          extraControls={props.toolbarControls}
          showLinksOption={props.showLinksOption}
          emptyLinksLabel={props.emptyLinksLabel}
        />
      </Drawer>

      <ReaderLinksDrawer
        opened={linksOpen && !isNavigating}
        onClose={() => setLinksOpen(false)}
        links={props.links}
        articleUrl={props.url}
        title={props.linksTitle}
        onShowSource={
          onShowLinkSource &&
          ((postUri) => {
            setLinksOpen(false);
            onShowLinkSource(postUri);
          })
        }
      />
    </ReaderLinkProvider>
  );
}
