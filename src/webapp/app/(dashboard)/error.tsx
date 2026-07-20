'use client';

import {
  BackgroundImage,
  Button,
  Center,
  Stack,
  Image,
  Text,
  Group,
  Container,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error(props: Props) {
  return (
    <>
      {/* light mode background */}
      <BackgroundImage
        src={BG.src}
        darkHidden
        h={'100svh'}
        pos={'fixed'}
        top={0}
        left={0}
        style={{ zIndex: 102, filter: 'grayscale(1)' }}
      />

      {/* dark mode background */}
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        h={'100svh'}
        pos={'fixed'}
        top={0}
        left={0}
        style={{ zIndex: 102, filter: 'grayscale(1)' }}
      />

      <Center
        h={'100svh'}
        py={{ base: '2rem', xs: '5rem' }}
        pos={'fixed'}
        top={0}
        left={0}
        w={'100%'}
        style={{ zIndex: 103 }}
      >
        <Container size={'sm'} p={'md'} my={'auto'}>
          <Stack align="center">
            <Image
              src={SembleLogo.src}
              alt="Semble logo"
              w={48}
              h={64.5}
              mx={'auto'}
            />

            <Stack gap={'xs'}>
              <Text fz={'h1'} fw={600} ta={'center'}>
                Something went wrong
              </Text>
              <Text
                fz={'lg'}
                fw={500}
                c={'dimmed'}
                ta={'center'}
                maw={300}
                mx={'auto'}
              >
                An unexpected error occurred. Please try again.
              </Text>
            </Stack>

            <Group justify="center" gap="xs" mt={'lg'}>
              <Button onClick={props.reset}>Try again</Button>

              <LinkButton href="/home" variant="default">
                Go home
              </LinkButton>
            </Group>
          </Stack>
        </Container>
      </Center>
    </>
  );
}
