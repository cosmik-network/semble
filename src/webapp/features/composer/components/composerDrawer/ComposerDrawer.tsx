'use client';

import { ActionIcon, Affix } from '@mantine/core';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useMediaQuery } from '@mantine/hooks';
import { useNavbarContext } from '@/providers/navbar';
import { useSearchParams } from 'next/navigation';
import { FLOATING_BOTTOM_OFFSET } from '@/lib/consts/layout';
import Composer from '../Composer';
import styles from './ComposerDrawer.module.css';

export default function ComposerDrawer() {
  const { mobileOpened, desktopOpened } = useNavbarContext();
  const isDesktop = useMediaQuery('(min-width: 36em)', false); // "sm" breakpoint
  const isNavOpen = isDesktop ? desktopOpened : mobileOpened;
  const shouldShowFab = !isNavOpen;
  const [opened, setOpened] = useState(false);

  // share_target support. on android could be any of these.
  const searchParams = useSearchParams();
  const addUrl =
    searchParams.get('addUrl') ||
    searchParams.get('addText') ||
    searchParams.get('addTitle');

  // Adjusted during render rather than in an effect. Remembering which share
  // opened the composer is what lets the reader close it again: the param stays
  // in the URL, so `if (addUrl) open` alone would reopen on every render.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (addUrl && openedFor !== addUrl) {
    setOpenedFor(addUrl);
    setOpened(true);
  }

  return (
    <Fragment key={shouldShowFab.toString()}>
      {/* Not gated on `shouldShowFab`, which comes from a media query and so
          resolves differently on the server. Unlike the portaled Affix this is
          real markup, so gating it mismatches on hydration. */}
      <div className={styles.fabClearance} />

      {shouldShowFab && (
        <Affix
          mt={'md'}
          mx={{ base: 20, sm: 'xs' }}
          mb={FLOATING_BOTTOM_OFFSET}
          style={{ zIndex: 101 }}
        >
          <ActionIcon
            size="input-xl"
            radius="xl"
            variant="filled"
            onClick={() => {
              setOpened((prev) => !prev);
            }}
          >
            <FiPlus size={30} />
          </ActionIcon>
        </Affix>
      )}

      <Composer
        isOpen={opened}
        initialUrl={addUrl || undefined}
        onClose={() => setOpened(false)}
      />
    </Fragment>
  );
}
