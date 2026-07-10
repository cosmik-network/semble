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
import FooterBG from '@/assets/footer-bg.png';
import FooterDarkBG from '@/assets/footer-bg-dark.png';
import EmailSubscribe from '@/components/landing/emailSubscribe/EmailSubscribe';

export default function Footer() {
  return (
    <Box
      component="footer"
      pt={{ base: '3rem', md: '5rem' }}
      pb={'0'}
      mt="xl"
      pos="relative"
      style={{
        overflow: 'hidden',
        minHeight: 'clamp(280px, 32vw, 420px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
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
          <Box mb="xl">
            <EmailSubscribe />
          </Box>
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
              href="https://discord.gg/SHvvysb73e"
              target="_blank"
              variant="subtle"
              color="white"
              radius="xl"
              size="xl"
            >
              <FaDiscord size={22} />
            </ActionIcon>
          </Group>

          <Group justify="center" gap="lg" mb="md" wrap="wrap">
            <Anchor
              href="https://userinput.app/#/s/did:plc:k7wclckeajmuibxbamtbejjg/3mofstjavqb2c"
              target="_blank"
              c="white"
              fw={600}
            >
              Give Feedback
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
              href="https://github.com/cosmik-network/semble/issues"
              target="_blank"
              c="white"
              fw={600}
            >
              Submit an Issue
            </Anchor>
          </Group>

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
