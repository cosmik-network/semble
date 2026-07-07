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
import { RiArrowRightUpLine } from 'react-icons/ri';
import { IoPhonePortraitOutline } from 'react-icons/io5';
import TangledIcon from '@/assets/icons/tangled-icon.svg';
import CosmikLogo from '@/assets/cosmik-logo-full.svg';
import CosmikLogoWhite from '@/assets/cosmik-logo-full-white.svg';
import FooterBG from '@/assets/footer-bg.png';
import DarkBG from '@/assets/semble-bg-dark.png';
import { IOS_SHORTCUT_URL } from '@/lib/consts/links';
import EmailSubscribe from '@/components/landing/emailSubscribe/EmailSubscribe';

export default function Footer() {
  return (
    <Box
      component="footer"
      pt={{ base: '3rem', md: '5rem' }}
      pb={{ base: '1.5rem', md: '2rem' }}
      mt="xl"
      pos="relative"
      style={{
        overflow: 'hidden',
        minHeight: 'clamp(300px, 42vw, 720px)',
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
        src={DarkBG.src}
        lightHidden
        pos="absolute"
        inset={0}
        style={{ backgroundPosition: 'bottom center', zIndex: 0 }}
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
