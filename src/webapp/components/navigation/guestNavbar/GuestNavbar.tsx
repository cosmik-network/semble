import NavItem from '../navItem/NavItem';
import {
  AppShellSection,
  AppShellNavbar,
  ScrollArea,
  Stack,
  Group,
  Anchor,
  Image,
  Box,
  Badge,
  Button,
  Text,
} from '@mantine/core';
import { MdOutlineEmojiNature } from 'react-icons/md';
import Link from 'next/link';
import SembleLogo from '@/assets/semble-logo.svg';
import NavbarToggle from '../NavbarToggle';
import { BiRightArrowAlt } from 'react-icons/bi';

export default function GuestNavbar() {
  return (
    <AppShellNavbar p={'xs'} style={{ zIndex: 3 }}>
      <Group justify="space-between">
        <Anchor component={Link} href={'/home'} mx={2}>
          <Stack align="center" gap={6}>
            <Image src={SembleLogo.src} alt="Semble logo" w={20.84} h={28} />
            <Badge size="xs">Alpha</Badge>
          </Stack>
        </Anchor>
        <Box hiddenFrom="xs">
          <NavbarToggle />
        </Box>
      </Group>

      <AppShellSection grow component={ScrollArea}>
        <Stack mt={'xl'}>
          <Stack>
            <Text fw={600} fz={'xl'}>
              A social knowledge network for researchers
            </Text>
            <Group grow>
              <Button component={Link} href="/signup">
                Sign up
              </Button>
              <Button
                component={Link}
                href="/login"
                color="var(--mantine-color-dark-filled)"
                rightSection={<BiRightArrowAlt size={22} />}
              >
                Log in
              </Button>
            </Group>
            <NavItem
              href="/explore"
              label="Explore"
              icon={<MdOutlineEmojiNature size={25} />}
            />
          </Stack>
        </Stack>
      </AppShellSection>
    </AppShellNavbar>
  );
}
