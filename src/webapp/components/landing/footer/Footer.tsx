import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Group,
  Stack,
  Image,
  Text,
} from '@mantine/core';
import { FaBluesky, FaDiscord, FaGithub } from 'react-icons/fa6';
import { RiArrowRightUpLine } from 'react-icons/ri';
import TangledIcon from '@/assets/icons/tangled-icon.svg';
import CosmikLogo from '@/assets/cosmik-logo-full.svg';
import CosmikLogoWhite from '@/assets/cosmik-logo-full-white.svg';

export default function Footer() {
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
