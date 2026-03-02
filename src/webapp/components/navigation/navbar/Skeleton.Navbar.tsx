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
import Link from 'next/link';
import SembleLogo from '@/assets/semble-logo.svg';
import NavbarToggle from '../NavbarToggle';

export default function NavbarSkeleton() {
  return (
    <AppShellNavbar p={'xs'} style={{ zIndex: 3 }}>
      <Group justify="space-between">
        <Anchor component={Link} href={'/home'} mx={2}>
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
        <Stack mt={'xl'}>
          {/* Profile Menu Skeleton */}
          <Group gap="sm" mx={5}>
            <Skeleton h={38} w={38} />
            <Skeleton height={18} width="60%" />
          </Group>

          {/* Nav Items Skeleton */}
          <Stack gap={5} mt="xs">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={40} radius="md" />
            ))}
          </Stack>
        </Stack>

        <Divider my={'sm'} />

        {/* Collections List Skeleton */}
        <Stack gap={5}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} height={36} radius="md" />
          ))}
        </Stack>
      </AppShellSection>

      <AppShellSection>
        <Skeleton w={'100%'} h={50} radius={'xl'} />
      </AppShellSection>
    </AppShellNavbar>
  );
}
