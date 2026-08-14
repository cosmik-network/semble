'use client';

import {
  Box,
  Center,
  Group,
  Image,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo-full.svg';
import OnboardingArtwork from '../onboardingArtwork/OnboardingArtwork';
import { STAGES } from './WelcomeView';

export default function WelcomeViewSkeleton() {
  return (
    <Box component="main" pos="relative" h={'100svh'} w={'100%'}>
      <OnboardingArtwork variant="welcome" />

      <Box pos={'absolute'} top={0} left={0} p={'md'} style={{ zIndex: 2 }}>
        <Image src={SembleLogo.src} alt="Semble logo" h={28} w={'auto'} />
      </Box>

      <Center
        pos="relative"
        h={'100%'}
        p={'md'}
        style={{ zIndex: 1, overflowY: 'auto' }}
      >
        <Stack
          gap={'xl'}
          align="flex-start"
          w={'fit-content'}
          maw={400}
          py={'xl'}
        >
          <Group gap={'sm'} w={'100%'}>
            <Skeleton h={56} w={56} radius={'md'} />
            <Skeleton h={28} w={180} radius={'sm'} />
          </Group>

          <Stack gap={'sm'} w={'100%'}>
            {STAGES.map((stage) => (
              <Group key={stage.title} gap={'sm'} wrap="nowrap" align="center">
                <ThemeIcon
                  variant="light"
                  color="gray"
                  size={'lg'}
                  radius={'xl'}
                >
                  {stage.icon}
                </ThemeIcon>

                <Text fw={600} c={'bright'}>
                  {stage.title}
                </Text>
              </Group>
            ))}
          </Stack>

          <Stack gap={'md'}>
            <Group gap={'xs'} wrap="nowrap">
              <Skeleton h={42} w={148} radius={'xl'} />
              <Skeleton h={42} w={104} radius={'xl'} />
            </Group>

            <Skeleton h={38} w={280} radius={'sm'} />
          </Stack>
        </Stack>
      </Center>
    </Box>
  );
}
