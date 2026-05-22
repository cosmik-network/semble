'use client';

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
  Badge,
  Skeleton,
} from '@mantine/core';

import SembleLogo from '@/assets/semble-logo.svg';
import NavbarToggle from '../NavbarToggle';
import CollectionsNavListSkeleton from '@/features/collections/components/collectionsNavList/Skeleton.CollectionsNavList';

export default function NavbarSkeleton() {
  return (
    <AppShellNavbar p={'xs'} style={{ zIndex: 3 }}>
      <Group justify="space-between">
        <Anchor href={'/home'} mx={2}>
          <Stack align="center" gap={6}>
            <Image src={SembleLogo.src} alt="Semble logo" w={20.84} h={28} />
            <Badge size="xs" style={{ cursor: 'pointer' }}>
              Alpha
            </Badge>
          </Stack>
        </Anchor>
        <Box hiddenFrom="xs">
          <NavbarToggle />
        </Box>
      </Group>

      <AppShellSection grow component={ScrollArea}>
        <Stack gap={'md'} mt={'xl'}>
          {/* Profile Menu Skeleton */}
          <Group gap="sm" m={5} wrap="nowrap">
            <Skeleton h={38} w={38} />
            <Skeleton height={18} width="80%" />
          </Group>

          {/* Nav Items Skeleton */}
          <Stack gap={5}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={40} radius="md" />
            ))}
          </Stack>
        </Stack>

        <Divider mb={'sm'} mt={'18'} />

        {/* Collections List Skeleton */}
        <CollectionsNavListSkeleton />
      </AppShellSection>

      <AppShellSection>
        <Skeleton w={'100%'} h={50} radius={'xl'} />
      </AppShellSection>
    </AppShellNavbar>
  );
}
