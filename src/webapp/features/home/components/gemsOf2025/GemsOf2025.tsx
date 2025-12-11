import { Group, Stack, Title, Text, Button, Card } from '@mantine/core';
import Link from 'next/link';
import Banner from '@/assets/gems-of-2025-banner.webp';

export default function GemsOf2025() {
  return (
    <Card
      p="xl"
      radius="lg"
      withBorder
      style={{
        backgroundImage: `url(${Banner.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Group gap="md" justify="center" style={{ position: 'relative' }}>
        <Stack align="center">
          <Stack gap={0} align="center">
            <Text fw={700} ta={'center'} fz={'h2'} c={'white'}>
              💎 Gems of 2025 💎
            </Text>
            <Text fw={700} ta={'center'} fz={'lg'} c={'blue.1'}>
              Top picks from our community
            </Text>
          </Stack>
          <Button
            component={Link}
            href="/explore/gems-of-2025"
            size="md"
            variant="white"
            color={'blue.8'}
            leftSection={<>💎</>}
          >
            Explore
          </Button>
        </Stack>
      </Group>
    </Card>
  );
}
