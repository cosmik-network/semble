import {
  AspectRatio,
  Box,
  Card,
  Divider,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { FiPlus } from 'react-icons/fi';
import { TbPlugConnected } from 'react-icons/tb';
import { BsThreeDots } from 'react-icons/bs';
import { trailUrlCard } from '../mockData';

// Mirrors the real UrlCardActions footer counts (FiPlus = library count,
// TbPlugConnected = connection count, BsThreeDots = menu).
function FooterStat(props: { icon: React.ReactNode; value: number }) {
  return (
    <Group gap={4} c="dimmed">
      {props.icon}
      <Text fz="sm" c="dimmed">
        {props.value}
      </Text>
    </Group>
  );
}

/**
 * The glowing URL card at the end of the trail. Decorative stand-in for a real
 * UrlCard — reuses the tangerine glow-border language from `DecorativeSearchBar`
 * to read as the destination the whole trail leads to.
 */
export default function TrailUrlCard() {
  return (
    <Card
      radius="lg"
      p="md"
      withBorder
      style={{
        borderWidth: '1.5px',
        borderColor: 'var(--mantine-color-tangerine-6)',
        boxShadow: '0 10px 40px -10px rgba(255, 100, 0, 0.45)',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="lg">
          <Stack gap={2} flex={1} style={{ overflow: 'hidden' }}>
            <Text c="dimmed" fz="sm" truncate>
              {trailUrlCard.domain}
            </Text>
            <Text c="bright" fw={600} lineClamp={1}>
              {trailUrlCard.title}
            </Text>
            <Text c="dimmed" fz="sm" lineClamp={2}>
              {trailUrlCard.description}
            </Text>
          </Stack>
          <AspectRatio ratio={1} w={56} miw={56}>
            <Box
              style={{
                borderRadius: 'var(--mantine-radius-md)',
                background:
                  'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
              }}
            />
          </AspectRatio>
        </Group>

        <Divider />

        <Group justify="space-between">
          <Group gap="lg">
            <FooterStat
              icon={<FiPlus size={16} />}
              value={trailUrlCard.libraryCount}
            />
            <FooterStat
              icon={<TbPlugConnected size={16} />}
              value={trailUrlCard.connectionCount}
            />
          </Group>
          <Box c="dimmed" style={{ display: 'flex' }}>
            <BsThreeDots size={18} />
          </Box>
        </Group>
      </Stack>
    </Card>
  );
}
