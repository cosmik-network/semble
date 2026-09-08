'use client';

import type { ReactNode } from 'react';
import { Popover, useDelayedHover } from '@mantine/core';
import {
  useReaderLinkDispatch,
  useReaderLinkState,
} from '../../lib/readerLinkState';
import type { ReaderLink } from '../../lib/utils/readerLink';
import ReaderLinkActions from '../ReaderLinkActions/ReaderLinkActions';

interface Props {
  /** Distinguishes repeated hrefs */
  id: number;
  link: ReaderLink;
  isHoverDevice: boolean;
  children: ReactNode;
}

export default function ReaderArticleLink(props: Props) {
  const { activeId } = useReaderLinkState();
  const dispatch = useReaderLinkDispatch();
  const opened = activeId === props.id;

  const open = () => dispatch({ type: 'open', id: props.id, link: props.link });
  const close = () => dispatch({ type: 'close', id: props.id });

  const { openDropdown, closeDropdown } = useDelayedHover({
    open,
    close,
    openDelay: 300,
    closeDelay: 200,
  });

  // On both target and dropdown so moving between them keeps it open
  const hoverHandlers = props.isHoverDevice
    ? { onMouseEnter: openDropdown, onMouseLeave: closeDropdown }
    : undefined;

  return (
    <Popover
      opened={opened}
      onChange={(next) => (next ? open() : close())}
      position="bottom"
      width={320}
      radius="lg"
      shadow="md"
      withArrow
      // Position against the hovered line of a wrapped anchor
      middlewares={{ flip: true, shift: true, inline: true }}
      styles={{
        dropdown: { maxWidth: 'calc(100vw - 2 * var(--mantine-spacing-md))' },
      }}
    >
      <Popover.Target>
        <a
          href={props.link.href}
          target="_blank"
          rel="noopener noreferrer"
          {...hoverHandlers}
          // No hover: tap opens the popover, its links open the URL
          onClick={
            props.isHoverDevice
              ? undefined
              : (e) => {
                  e.preventDefault();
                  if (opened) close();
                  else open();
                }
          }
        >
          {props.children}
        </a>
      </Popover.Target>
      <Popover.Dropdown p="sm" {...hoverHandlers}>
        <ReaderLinkActions
          link={props.link}
          onAdd={() =>
            dispatch({ type: 'request', modal: 'add', link: props.link })
          }
          onConnect={() =>
            dispatch({ type: 'request', modal: 'connect', link: props.link })
          }
        />
      </Popover.Dropdown>
    </Popover>
  );
}
