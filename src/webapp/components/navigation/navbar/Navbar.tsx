import CollectionsNavList from '@/features/collections/components/collectionsNavList/CollectionsNavList';
import NavItem from '../navItem/NavItem';
import {
  AppShellSection,
  AppShellNavbar,
  ScrollArea,
  Divider,
  Stack,
  Group,
  Anchor,
  Image,
  Box,
  Button,
} from '@mantine/core';
import { LuLibrary } from 'react-icons/lu';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { FaRegNoteSticky } from 'react-icons/fa6';
import Link from 'next/link';
import SembleLogo from '@/assets/semble-logo.svg';
import ProfileMenu from '@/features/profile/components/profileMenu/ProfileMenu';
import { Suspense, useState } from 'react';
import CollectionsNavListSkeleton from '@/features/collections/components/collectionsNavList/Skeleton.CollectionsNavList';
import NavbarToggle from '../NavbarToggle';
import { FiPlus } from 'react-icons/fi';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';

export default function Navbar() {
  const [openAddDrawer, setOpenAddDrawer] = useState(false);
  const { data: profile } = useMyProfile();

  return (
    <AppShellNavbar px={'md'} pb={'md'} pt={'xs'}>
      <Group justify="space-between" ml={'sm'}>
        <Anchor component={Link} href={'/home'}>
          <Image src={SembleLogo.src} alt="Semble logo" w={20.84} h={28} />
        </Anchor>
        <Box hiddenFrom="xs">
          <NavbarToggle />
        </Box>
      </Group>

      <AppShellSection grow component={ScrollArea}>
        <Stack mt={'xl'}>
          <ProfileMenu />

          <Stack gap={5}>
            <NavItem href="/home" label="Home" icon={<LuLibrary size={25} />} />
            <NavItem
              href={`/profile/${profile.handle}/cards`}
              label="Cards"
              icon={<FaRegNoteSticky size={25} />}
            />
            <NavItem
              href="/explore"
              label="Explore"
              icon={<MdOutlineEmojiNature size={25} />}
            />
          </Stack>
        </Stack>

        <Divider my={'sm'} />
        <Suspense fallback={<CollectionsNavListSkeleton />}>
          <CollectionsNavList />
        </Suspense>
      </AppShellSection>
      <AppShellSection>
        <Button
          size="lg"
          fullWidth
          leftSection={<FiPlus size={22} />}
          onClick={() => setOpenAddDrawer(true)}
        >
          New Card
        </Button>
      </AppShellSection>
      <AddCardDrawer
        isOpen={openAddDrawer}
        onClose={() => setOpenAddDrawer(false)}
      />
    </AppShellNavbar>
  );
}
