'use client';

import {
  ActionIcon,
  AspectRatio,
  Button,
  Card,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { TbPlugConnected } from 'react-icons/tb';
import { BsThreeDots } from 'react-icons/bs';
import { trailUrlCard } from '../mockData';

/**
 * The glowing URL card at the end of the trail. Decorative stand-in for a real
 * UrlCard that mirrors its grid-view layout — `LinkCardContent` (domain / title
 * / description with a square og:image preview) above a `UrlCardActions` footer
 * of light pill buttons (save count, connection count, menu). Keeps the
 * tangerine glow-border language from `DecorativeSearchBar` so it reads as the
 * destination the whole trail leads to.
 */
export default function TrailUrlCard() {
  const [imageError, setImageError] = useState(false);

  return (
    <Card
      radius="lg"
      p="sm"
      withBorder
      style={{
        borderWidth: '1.5px',
        borderColor: 'var(--mantine-color-tangerine-6)',
        boxShadow: '0 10px 40px -10px rgba(255, 100, 0, 0.45)',
      }}
    >
      <Stack justify="space-between" gap="md">
        {/* Mirrors LinkCardContent */}
        <Group justify="space-between" align="start" gap="lg" wrap="nowrap">
          <Stack gap={0} flex={1} style={{ overflow: 'hidden' }}>
            <Text c="gray" fz="sm" lineClamp={1} w="fit-content">
              {trailUrlCard.domain}
            </Text>
            <Text c="bright" fw={500} lineClamp={2}>
              {trailUrlCard.title}
            </Text>
            <Text c="gray" fz="sm" mt="xs" lineClamp={3}>
              {trailUrlCard.description}
            </Text>
          </Stack>
          {trailUrlCard.imageUrl && !imageError && (
            <AspectRatio ratio={1 / 1}>
              <Image
                src={trailUrlCard.imageUrl}
                alt={`${trailUrlCard.domain} social preview image`}
                radius="md"
                w={75}
                h={75}
                onError={() => setImageError(true)}
              />
            </AspectRatio>
          )}
        </Group>

        {/* Mirrors UrlCardActions */}
        <Group justify="space-between">
          <Group gap="xs">
            <Button
              variant="light"
              color="gray"
              size="xs"
              radius="xl"
              leftSection={<FiPlus size={18} />}
            >
              {trailUrlCard.libraryCount}
            </Button>
            <Button
              variant="light"
              color="gray"
              size="xs"
              radius="xl"
              leftSection={<TbPlugConnected size={15} />}
            >
              {trailUrlCard.connectionCount}
            </Button>
          </Group>
          <ActionIcon variant="light" color="gray" radius="xl">
            <BsThreeDots size={18} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
}
