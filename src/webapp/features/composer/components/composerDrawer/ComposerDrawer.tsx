'use client';

import { ActionIcon, Affix } from '@mantine/core';
import { Fragment, useEffect, useState } from 'react';
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
  const shareUrl = useSearchParams().get('addUrl');
  const shareText = useSearchParams().get('addText');
  const shareTitle = useSearchParams().get('addTitle');
  const addUrl = shareUrl || shareText || shareTitle;

  useEffect(() => {
    if (addUrl) {
      setOpened(true);
    }
  }, [addUrl]);

  return (
    <Fragment key={shouldShowFab.toString()}>
      {shouldShowFab && (
        <Fragment>
          <div className={styles.fabClearance} />
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
        </Fragment>
      )}

      <Composer
        isOpen={opened}
        initialUrl={addUrl || undefined}
        onClose={() => setOpened(false)}
      />
    </Fragment>
  );
}
