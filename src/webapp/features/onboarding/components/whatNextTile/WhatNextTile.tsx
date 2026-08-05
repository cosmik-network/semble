'use client';

import { Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IoMdCheckmark } from 'react-icons/io';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  done?: boolean;
  locked?: boolean;
  lockedHint?: string;
  onClick?: () => void;
  /** Expanded content, rendered below the tile body when present. */
  children?: React.ReactNode;
}

export default function WhatNextTile(props: Props) {
  const isInteractive = !props.locked && !!props.onClick;

  return (
    <Card
      withBorder
      radius={'lg'}
      p={'md'}
      opacity={props.locked ? 0.55 : 1}
      onClick={isInteractive ? props.onClick : undefined}
      style={{ cursor: isInteractive ? 'pointer' : 'default' }}
    >
      <Stack gap={'sm'}>
        <Group gap={'sm'} wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" size={'lg'} radius={'md'} color="gray">
            {props.icon}
          </ThemeIcon>

          <Stack gap={2} miw={0} flex={1}>
            <Group gap={6} wrap="nowrap">
              <Text fw={700} c={'bright'}>
                {props.title}
              </Text>
              {props.done && (
                <ThemeIcon
                  variant="light"
                  color="green"
                  size={'sm'}
                  radius={'xl'}
                >
                  <IoMdCheckmark size={12} />
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

        {props.children}
      </Stack>
    </Card>
  );
}
