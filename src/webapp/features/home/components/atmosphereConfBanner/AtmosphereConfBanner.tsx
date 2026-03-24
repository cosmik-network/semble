import { Button, Card, Group, Text, Stack, Image } from '@mantine/core';
import AtmosphereConfBannerImage from '@/assets/atmosphereConf-banner.webp';
import Goosetopher from '@/assets/goosetopher.webp';
import Link from 'next/link';

export default function AtmosphereConfBanner() {
  return (
    <Card
      p={{ base: 'lg', sm: 'xl' }}
      radius="lg"
      style={{
        backgroundImage: `url(${AtmosphereConfBannerImage.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Group gap="md" justify="space-between" wrap="nowrap">
        <Stack align="start">
          <Stack gap={0}>
            <Text fw={700} fz={'h2'} c={'white'}>
              <Text fw={700} fz={'h2'} c={'#113D7C'} span>
                #AT
              </Text>
              mosphereConf
            </Text>
            <Text fw={700} fz={'lg'} c={'blue.0'}>
              The global AT Protocol community conference
            </Text>
            <Text fw={700} fz={'sm'} c={'blue.1'} mt={'sm'} maw={450}>
              Want to feature your collection? Add #atmosphereConf to your
              collection's name or description
            </Text>
          </Stack>
          <Button
            component={Link}
            href="/explore"
            size="md"
            variant="white"
            color={'blue.8'}
          >
            View Collections
          </Button>
        </Stack>
        <Image
          src={Goosetopher.src}
          alt="Goosetopher"
          w={{ base: 70, sm: 80 }}
          h={'auto'}
        />
      </Group>
    </Card>
  );
}
