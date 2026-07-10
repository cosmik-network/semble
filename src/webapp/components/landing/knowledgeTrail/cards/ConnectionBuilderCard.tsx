'use client';

import {
  Button,
  Card,
  Divider,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useState } from 'react';
import { BsCheck } from 'react-icons/bs';
import { BiSolidChevronDown } from 'react-icons/bi';
import { LuChevronsUpDown } from 'react-icons/lu';
import { TbWorld } from 'react-icons/tb';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import { connectionExample } from '../mockData';

const typeByValue = new Map(CONNECTION_TYPES.map((t) => [t.value, t]));

// One end of the connection — a compact link preview (favicon + domain + title),
// mirroring SearchResultsCard's favicon tile. Falls back to a globe icon if the
// remote favicon fails to load.
function LinkRow(props: {
  domain: string;
  title: string;
  faviconUrl: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Card withBorder radius="lg" p="xs">
        <Group gap="sm" wrap="nowrap">
          <Paper
            withBorder
            radius="md"
            bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
            w={35}
            h={35}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {failed ? (
              <TbWorld size={14} color="var(--mantine-color-gray-5)" />
            ) : (
              <Image
                src={props.faviconUrl}
                alt=""
                w={16}
                h={16}
                fit="contain"
                onError={() => setFailed(true)}
              />
            )}
          </Paper>
          <Stack gap={0} style={{ overflow: 'hidden' }}>
            <Text c="gray" fz="xs" lineClamp={1}>
              {props.domain}
            </Text>
            <Text c="bright" fw={500} fz="sm" lineClamp={1}>
              {props.title}
            </Text>
          </Stack>
        </Group>
      </Card>
  );
}

/**
 * Decorative mini connect-form for the "Follow the thoughtful connections others
 * have made" trail stop. Mirrors the real AddConnectionForm layout — From link →
 * green connection-type selector with its picker shown open → To link — so it
 * shows an actual connection plus the full range of relations a curator can pick.
 * Reuses the real CONNECTION_TYPES config; entirely non-interactive.
 */
export default function ConnectionBuilderCard() {
  const activeType = typeByValue.get(connectionExample.activeType);
  const ActiveIcon = activeType?.icon;

  return (
    <Card
      withBorder
      radius="lg"
      p="sm"
      maw={340}
      mx="auto"
      style={{ boxShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.25)' }}
    >
      <Stack gap={0}>
        <LinkRow {...connectionExample.source} />

        <Divider orientation="vertical" size="md" h={14} mx="auto" />

        {/* Selector + open picker as one unit (stand-in for the real combobox in
            its open state): the selected relation on top, the full list below. */}
        <Paper withBorder radius="lg" shadow="sm" p={6}>
          <Stack gap={8} align="center">
            <Button
              component="div"
              color="green"
              size="sm"
              radius="xl"
              w="fit-content"
              leftSection={ActiveIcon ? <ActiveIcon size={16} /> : null}
              rightSection={<LuChevronsUpDown size={16} />}
            >
              {activeType?.label ?? 'Select a relation'}
            </Button>

            <ScrollArea.Autosize type="always" mah={96} w="100%">
          <Stack gap={0} pr="sm">
            {CONNECTION_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = type.value === connectionExample.activeType;
              return (
                <Group
                  key={type.value}
                  gap="sm"
                  wrap="nowrap"
                  px="xs"
                  py={5}
                  style={{
                    borderRadius: 'var(--mantine-radius-sm)',
                    background: isActive
                      ? 'var(--mantine-color-green-light)'
                      : undefined,
                  }}
                >
                  <Icon size={16} color="var(--mantine-color-green-6)" />
                  <Text
                    fz="sm"
                    c="bright"
                    fw={isActive ? 600 : 500}
                    style={{ flex: 1 }}
                  >
                    {type.label}
                  </Text>
                  {isActive && (
                    <BsCheck size={18} color="var(--mantine-color-green-6)" />
                  )}
                </Group>
              );
            })}
          </Stack>
            </ScrollArea.Autosize>
          </Stack>
        </Paper>

        <Stack align="center" gap={0}>
          <Divider orientation="vertical" size="md" h={14} mx="auto" />
          <ThemeIcon
            size="xs"
            color="var(--mantine-color-disabled-border)"
            c="gray"
            radius="xl"
          >
            <BiSolidChevronDown size={12} />
          </ThemeIcon>
        </Stack>

        <LinkRow {...connectionExample.target} />
      </Stack>
    </Card>
  );
}
