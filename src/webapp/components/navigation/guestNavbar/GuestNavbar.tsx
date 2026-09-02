'use client';

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
  Card,
  Text,
} from '@mantine/core';
import { HiOutlineHome } from 'react-icons/hi';
import { MdOutlineEmojiNature } from 'react-icons/md';
import SembleLogo from '@/assets/semble-logo.svg';
import NavbarToggle from '../NavbarToggle';
import { BiRightArrowAlt, BiSearch } from 'react-icons/bi';
import { TbSettings } from 'react-icons/tb';
import { LinkButton } from '@/components/link/MantineLink';
import { useLoginHref } from '@/hooks/useLoginHref';
import { useNavbarContext } from '@/providers/navbar';
import classes from './GuestNavbar.module.css';

export default function GuestNavbar() {
  const loginHref = useLoginHref();
  const { toggleMobile } = useNavbarContext();

  // z-index clears the sticky Header (100), which the open mobile navbar covers
  return (
    <AppShellNavbar p={'xs'} style={{ zIndex: 101 }}>
      <Group justify="space-between">
        <Anchor href={'/home'} mx={2}>
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
        <Stack mt={'md'}>
          <Card p={'sm'} radius={'lg'} className={classes.cta}>
            <Stack gap={'sm'}>
              <Text fw={600} fz={'md'}>
                Save what matters. Make sense of it together.
              </Text>
              <Group gap={'xs'}>
                <LinkButton href="/signup" size="md" onClick={toggleMobile}>
                  Sign up
                </LinkButton>
                <LinkButton
                  href={loginHref}
                  color="var(--mantine-color-dark-filled)"
                  size="md"
                  rightSection={<BiRightArrowAlt size={22} />}
                  onClick={toggleMobile}
                >
                  Log in
                </LinkButton>
              </Group>
            </Stack>
          </Card>

          <Stack gap={5}>
            <NavItem
              href="/home"
              label="Home"
              icon={<HiOutlineHome size={25} />}
            />

            <NavItem
              href="/explore"
              label="Explore"
              icon={<MdOutlineEmojiNature size={25} />}
            />

            <NavItem
              href="/search"
              label="Search"
              icon={<BiSearch size={25} />}
            />

            <NavItem
              href="/settings"
              label="Settings"
              icon={<TbSettings size={25} />}
            />
          </Stack>
        </Stack>
      </AppShellSection>
    </AppShellNavbar>
  );
}
