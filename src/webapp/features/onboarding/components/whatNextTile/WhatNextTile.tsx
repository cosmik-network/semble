'use client';

import {
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import { IoMdCheckmark } from 'react-icons/io';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  done?: boolean;
  locked?: boolean;
  lockedHint?: string;
  onClick?: () => void;
  /** Only for tiles that expand in place — drives aria-expanded. */
  expanded?: boolean;
  /** Expanded content, rendered below the tile body when present. */
  children?: React.ReactNode;
}

export default function WhatNextTile(props: Props) {
  const isInteractive = !props.locked && !!props.onClick;

  const header = (
    <Group gap={'sm'} wrap="nowrap" align="flex-start" w={'100%'}>
      <ThemeIcon variant="light" size={'lg'} radius={'md'} color="gray">
        {props.icon}
      </ThemeIcon>

      <Stack gap={2} miw={0} flex={1}>
        <Group gap={6} wrap="nowrap">
          <Text fw={700} c={'bright'}>
            {props.title}
          </Text>
          {props.done && (
            <ThemeIcon variant="light" color="green" size={'sm'} radius={'xl'}>
              <IoMdCheckmark size={12} />
              <VisuallyHidden>Done</VisuallyHidden>
            </ThemeIcon>
          )}
        </Group>
        <Text fz={'sm'} c={'dimmed'}>
          {props.locked && props.lockedHint
            ? props.lockedHint
            : props.description}
        </Text>
      </Stack>
    </Group>
  );

  return (
    <Card withBorder radius={'lg'} p={'md'} opacity={props.locked ? 0.55 : 1}>
      <Stack gap={'sm'}>
        {/* A real <button> around the header rather than role="button" on the
            whole Card. The connect tile renders UrlCards — each with its own
            buttons — in props.children, and nested interactive content inside
            a button is invalid HTML and unreadable to a screen reader. Keeping
            the control to the header leaves children outside it, and also
            stops a click inside the expanded region from bubbling up and
            collapsing the tile.

            A locked tile renders the plain header: not focusable, and not
            announced as something you can activate. */}
        {isInteractive ? (
          <UnstyledButton
            onClick={props.onClick}
            aria-expanded={props.expanded}
          >
            {header}
          </UnstyledButton>
        ) : (
          header
        )}

        {props.children}
      </Stack>
    </Card>
  );
}
