import {
  ActionIcon,
  Anchor,
  BackgroundImage,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Image,
  Text,
} from '@mantine/core';
import { FaBluesky, FaDiscord, FaGithub } from 'react-icons/fa6';
import TangledIcon from '@/assets/icons/tangled-icon.svg';
import CosmikLogo from '@/assets/cosmik-logo-full.svg';
import CosmikLogoWhite from '@/assets/cosmik-logo-full-white.svg';
import FooterBG from '@/assets/footer-bg.webp';
import FooterDarkBG from '@/assets/footer-bg-dark.webp';
import ThemeToggle from '@/components/landing/themeToggle/ThemeToggle';
import BlogUpdates from '../blogUpdates/BlogUpdates';

export default function Footer() {
  // mt={0}: the blog + subscribe block above this is meant to read as the
  // footer's top band, so the only space between them is this Box's top padding
  // — which falls inside the top fade below, where the background is still body
  // colour rather than the photo.
  return (
    <Box
      component="footer"
      pt={{ base: '3rem', md: '5rem' }}
      pb={'0'}
      mt={0}
      pos="relative"
      style={{
        overflow: 'hidden',
        minHeight: 'clamp(280px, 32vw, 420px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <Box pos="relative" style={{ zIndex: 1 }}>
        <BlogUpdates />
      </Box>

      {/* light mode bg */}
      <BackgroundImage
        src={FooterBG.src}
        darkHidden
        pos="absolute"
        inset={0}
        style={{ backgroundPosition: 'bottom center', zIndex: 0 }}
      />

      {/* dark mode bg */}
      <BackgroundImage
        src={FooterDarkBG.src}
        lightHidden
        pos="absolute"
        inset={0}
        style={{ backgroundPosition: 'bottom center', zIndex: 0 }}
      />

      {/* darkening overlay */}
      <Box
        pos="absolute"
        inset={0}
        style={{
          zIndex: 0,
          background: 'rgba(0, 0, 0, 0.1)',
          pointerEvents: 'none',
        }}
      />

      {/* light mode top fade — keeps the top blending to white at any height */}
      <Box
        darkHidden
        pos="absolute"
        inset={0}
        style={{
          zIndex: 0,
          background:
            'linear-gradient(to bottom, var(--mantine-color-white) 0%, rgba(255, 255, 255, 0.6) 25%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* dark mode top fade */}
      <Box
        lightHidden
        pos="absolute"
        inset={0}
        style={{
          zIndex: 0,
          background:
            'linear-gradient(to bottom, var(--mantine-color-body) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <Container size="xl" p="sm" w="100%" pos="relative" style={{ zIndex: 1 }}>
        <Stack align="center" gap="xs">
          <Group gap="0">
            <ActionIcon
              component="a"
              href="https://bsky.app/profile/semble.so"
              target="_blank"
              variant="subtle"
              color="white"
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
              color="white"
              radius="xl"
              size="xl"
            >
              <Image src={TangledIcon.src} alt="Tangled logo" w="auto" h={22} />
            </ActionIcon>
            <ActionIcon
              component="a"
              href="https://github.com/cosmik-network/semble"
              target="_blank"
              variant="subtle"
              color="white"
              radius="xl"
              size="xl"
            >
              <FaGithub size={22} />
            </ActionIcon>
            <ActionIcon
              component="a"
              href="https://discord.gg/vq7KzPkhCs"
              target="_blank"
              variant="subtle"
              color="white"
              radius="xl"
              size="xl"
            >
              <FaDiscord size={22} />
            </ActionIcon>

            {/* dot separator — a fixed-size element, so it can't collapse or
                mis-align the way a stretched vertical rule does */}
            <Box
              w={4}
              h={4}
              mx="sm"
              style={{
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
              }}
            />

            <ThemeToggle />
          </Group>

          <Stack align="center" gap="xs" mb="md">
            <Group justify="center" gap="lg" wrap="wrap">
              <Anchor
                href="https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg"
                target="_blank"
                c="white"
                fw={600}
              >
                Chrome extension
              </Anchor>
              <Anchor
                href="https://addons.mozilla.org/en-US/firefox/addon/semble/"
                target="_blank"
                c="white"
                fw={600}
              >
                Firefox extension
              </Anchor>
              <Anchor
                href={
                  'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6'
                }
                target="_blank"
                c="white"
                fw={600}
              >
                iOS shortcut
              </Anchor>
            </Group>
            <Group justify="center" gap="lg" wrap="wrap">
              <Anchor
                href="https://docs.cosmik.network/semble"
                target="_blank"
                c="white"
                fw={600}
              >
                Semble Docs
              </Anchor>
              <Anchor
                href="https://blog.cosmik.network/"
                target="_blank"
                c="white"
                fw={600}
              >
                Blog
              </Anchor>
              <Anchor
                href="https://userinput.app/#/s/did:plc:k7wclckeajmuibxbamtbejjg/3mofstjavqb2c"
                target="_blank"
                c="white"
                fw={600}
              >
                Give Feedback
              </Anchor>
              <Anchor
                href="https://github.com/cosmik-network/semble/issues"
                target="_blank"
                c="white"
                fw={600}
              >
                Submit an Issue
              </Anchor>
            </Group>
          </Stack>

          <Stack align="center" gap="0">
            <Text c="white" fw={600} ta="center">
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
              <Text c="white" fw={600} span>
                with support from&nbsp;
                <Anchor
                  href="https://coefficientgiving.org/"
                  target="_blank"
                  c="white"
                  fw={700}
                >
                  Coefficient Giving
                </Anchor>{' '}
                and{' '}
                <Anchor
                  href="https://astera.org/"
                  target="_blank"
                  c="white"
                  fw={700}
                >
                  Astera
                </Anchor>
              </Text>
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
