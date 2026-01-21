'use client';

import {
  ActionIcon,
  SimpleGrid,
  Image,
  Text,
  BackgroundImage,
  Title,
  Stack,
  Button,
  Container,
  Box,
  Center,
  Group,
  Anchor,
  Badge,
} from '@mantine/core';
import { FaBluesky, FaGithub, FaDiscord } from 'react-icons/fa6';
import { BiRightArrowAlt } from 'react-icons/bi';
import { RiArrowRightUpLine } from 'react-icons/ri';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import CosmikLogo from '@/assets/cosmik-logo-full.svg';
import CosmikLogoWhite from '@/assets/cosmik-logo-full-white.svg';
import CurateIcon from '@/assets/icons/curate-icon.svg';
import CommunityIcon from '@/assets/icons/community-icon.svg';
import DBIcon from '@/assets/icons/db-icon.svg';
import BigPictureIcon from '@/assets/icons/big-picture-icon.svg';
import TangledIcon from '@/assets/icons/tangled-icon.svg';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import { useOs } from '@mantine/hooks';
import AnimatedTitle from '@/components/landing/animatedTitle/AnimatedTitle';

export default function Home() {
  const fadeStyle = {
    inset: 0,
    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 35%)',
    maskImage: 'linear-gradient(to top, transparent 0%, black 35%)',
    zIndex: 0,
  };

  return (
    <Box component="section" pos="relative" h="100svh" w="100%">
      {/* light mode bg */}
      <BackgroundImage
        src={BG.src}
        darkHidden
        h="100svh"
        pos={'absolute'}
        style={fadeStyle}
      />

      {/* dark mode bg */}
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        h="100svh"
        pos={'absolute'}
        style={fadeStyle}
      />

      <Box pos="relative" style={{ zIndex: 1 }}>
        <Content />
      </Box>
    </Box>
  );
}

function Content() {
  const os = useOs();

  return (
    <>
      <script async src="https://tally.so/widgets/embed.js" />
      <Container size="xl" p="md" my="auto">
        <Group justify="space-between">
          <Stack gap={6} align="center">
            <Image src={SembleLogo.src} alt="Semble logo" w={30} h="auto" />
            <Badge size="sm">Alpha</Badge>
          </Stack>
          <Group gap={'sm'}>
            {os === 'ios' && (
              <Button
                component={Link}
                href={
                  'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6'
                }
                target="_blank"
                variant="light"
                color="grape"
              >
                iOS shortcut
              </Button>
            )}
            <Button
              data-tally-open="31a9Ng"
              data-tally-hide-title="1"
              data-tally-layout="modal"
              data-tally-emoji-animation="none"
              variant="default"
              size="sm"
            >
              Stay in the loop
            </Button>
          </Group>
        </Group>
      </Container>

      <Center h="100svh" py={{ base: '2rem', xs: '5rem' }}>
        <Container size="xl" p="md" my="auto">
          <Stack align="center" gap="5rem">
            <Stack gap="xs" maw={550} mx="auto">
              <AnimatedTitle />

              {/* light mode subtitle */}
              <Title order={2} fw={600} fz="xl" c="#1F6144" darkHidden>
                Follow your peers’ research trails. Surface and discover new
                connections. Built on ATProto so you own your data.
              </Title>

              {/* dark mode subtitle */}
              <Title order={2} fw={600} fz="xl" c="#1e4dd9" lightHidden>
                Follow your peers’ research trails. Surface and discover new
                connections. Built on ATProto so you own your data.
              </Title>

              <Group gap="md" mt="lg">
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

            <SimpleGrid
              cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
              spacing={{ base: 'xl' }}
              mt={{ base: '1rem', xs: '5rem' }}
            >
              <Stack gap="xs">
                <Image src={CurateIcon.src} alt="Curate icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    Curate your research trails.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    Collect interesting links, add notes, and organize them into
                    shareable collections. Build trails others can explore and
                    extend.
                  </Text>
                </Text>
              </Stack>
              <Stack gap="xs">
                <Image src={CommunityIcon.src} alt="Community icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    Connect with peers.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    See what your peers are sharing and find new collaborators
                    with shared interests. Experience research rabbit holes,
                    together.
                  </Text>
                </Text>
              </Stack>
              <Stack gap="xs">
                <Image src={DBIcon.src} alt="Database icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    Own your data.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    Built on ATProto, new apps will come to you. No more
                    rebuilding your social graph and data when apps pivot and
                    shut down.
                  </Text>
                </Text>
              </Stack>
              <Stack gap="xs">
                <Image src={BigPictureIcon.src} alt="Big picture icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    See the bigger picture.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    Find what&apos;s relevant through your network. Get the
                    extra context that matters before you dive into content.
                  </Text>
                </Text>
              </Stack>
            </SimpleGrid>

            <Footer />
          </Stack>
        </Container>
      </Center>
    </>
  );
}

function Footer() {
  return (
    <Box component="footer" px="md" py="xs" mt="xl" pos="relative">
      <Stack align="center" gap="xs">
        <Group gap="0">
          <ActionIcon
            component="a"
            href="https://bsky.app/profile/cosmik.network"
            target="_blank"
            variant="subtle"
            color="dark.2"
            radius="xl"
            size="xl"
            m={0}
          >
            <FaBluesky size={22} />
          </ActionIcon>
          <ActionIcon
            component="a"
            href="https://tangled.org/@cosmik.network/semble"
            target="_blank"
            variant="subtle"
            color="dark.2"
            radius="xl"
            size="xl"
          >
            <Image src={TangledIcon.src} alt="Tangled logo" w="auto" h={22} />
          </ActionIcon>
          <ActionIcon
            component="a"
            href="https://github.com/cosmik-network"
            target="_blank"
            variant="subtle"
            color="dark.2"
            radius="xl"
            size="xl"
          >
            <FaGithub size={22} />
          </ActionIcon>
          <ActionIcon
            component="a"
            href="https://discord.gg/SHvvysb73e"
            target="_blank"
            variant="subtle"
            color="dark.2"
            radius="xl"
            size="xl"
          >
            <FaDiscord size={22} />
          </ActionIcon>
        </Group>
        <Group gap={'xs'} justify="center">
          <Button
            component="a"
            href="https://blog.cosmik.network"
            target="_blank"
            variant="light"
            color="dark.1"
            fw={600}
            rightSection={<RiArrowRightUpLine />}
          >
            Follow our blog for updates
          </Button>
          <Button
            component="a"
            href="https://docs.cosmik.network/semble"
            target="_blank"
            variant="light"
            color="dark.1"
            fw={600}
            rightSection={<RiArrowRightUpLine />}
          >
            Semble Docs
          </Button>
        </Group>
        <Stack align="center" gap="0">
          <Text c="dark.1" fw={600} ta="center">
            Made by &nbsp;
            <Anchor
              href="https://cosmik.network/"
              target="_blank"
              style={{ verticalAlign: 'middle' }}
            >
              <Box
                component="span"
                display="inline-flex"
                style={{ verticalAlign: 'middle' }}
              >
                {/* light logo */}
                <Image
                  src={CosmikLogo.src}
                  alt="Cosmik logo"
                  w={92}
                  h={28.4}
                  darkHidden
                />
                {/* dark logo */}
                <Image
                  src={CosmikLogoWhite.src}
                  alt="Cosmik logo white"
                  w={92}
                  h={28.4}
                  lightHidden
                />
              </Box>
            </Anchor>
            &nbsp;&nbsp;
            <Text c="dark.1" fw={600} span>
              with support from&nbsp;
              <Anchor
                href="https://coefficientgiving.org/"
                target="_blank"
                c="dark.2"
                fw={600}
              >
                Coefficient Giving
              </Anchor>{' '}
              and{' '}
              <Anchor
                href="https://astera.org/"
                target="_blank"
                c="dark.2"
                fw={600}
              >
                Astera
              </Anchor>
            </Text>
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
