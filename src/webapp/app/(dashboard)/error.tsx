'use client';

import {
  BackgroundImage,
  Center,
  Stack,
  Image,
  Badge,
  Text,
  Group,
  Button,
  Container,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import Link from 'next/link';
import { BiRightArrowAlt } from 'react-icons/bi';

export default function Error() {
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
        style={{ zIndex: 102 }}
      >
        <Content />
      </BackgroundImage>

      {/* dark mode background */}
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        h={'100svh'}
        pos={'fixed'}
        top={0}
        left={0}
        style={{ zIndex: 102 }}
      >
        <Content />
      </BackgroundImage>
    </>
  );
}

function Content() {
  return (
    <Center h={'100svh'} py={{ base: '2rem', xs: '5rem' }}>
      <Container size={'xl'} p={'md'} my={'auto'}>
        <Stack>
          <Stack align="center" gap={'xs'}>
            <Image
              src={SembleLogo.src}
              alt="Semble logo"
              w={48}
              h={64.5}
              mx={'auto'}
            />
            <Badge size="sm">Alpha</Badge>
          </Stack>

          <Stack>
            <Text fz={'h1'} fw={600} ta={'center'}>
              A social knowledge network for research
            </Text>
            <Text fz={'h3'} fw={600} c={'#1e4dd9'} ta={'center'} lightHidden>
              Follow your peers’ research trails. Surface and discover new
              connections. Built on ATProto so you own your data.
            </Text>
            <Text fz={'h3'} fw={600} c={'#1F6144'} ta={'center'} darkHidden>
              Follow your peers’ research trails. Surface and discover new
              connections. Built on ATProto so you own your data.
            </Text>
          </Stack>

          <Group justify="center" gap="md" mt={'lg'}>
            <Button component={Link} href="/signup" size="lg">
              Sign up
            </Button>

            <Button
              component={Link}
              href="/login"
              size="lg"
              color="var(--mantine-color-dark-filled)"
              rightSection={<BiRightArrowAlt size={22} />}
            >
              Log in
            </Button>
          </Group>
        </Stack>
      </Container>
    </Center>
  );
}
