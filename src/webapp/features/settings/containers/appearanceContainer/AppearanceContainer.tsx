'use client';

import {
  Container,
  Stack,
  SegmentedControl,
  Center,
  Text,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import {
  MdOutlineDarkMode,
  MdOutlineLightMode,
  MdOutlineSmartphone,
} from 'react-icons/md';
import { BsGrid, BsListUl } from 'react-icons/bs';
import { CiGrid2H } from 'react-icons/ci';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

export default function AppearanceContainer() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { settings, updateSetting } = useUserSettings();

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Stack gap="xs">
          <Text fw={500}>Theme</Text>
          <SegmentedControl
            size="md"
            withItemsBorders={false}
            value={colorScheme}
            onChange={(value) =>
              setColorScheme(value as 'light' | 'dark' | 'auto')
            }
            data={[
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <MdOutlineLightMode />
                    <span>Light</span>
                  </Center>
                ),
                value: 'light',
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <MdOutlineDarkMode />
                    <span>Dark</span>
                  </Center>
                ),
                value: 'dark',
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <MdOutlineSmartphone />
                    <span>Auto</span>
                  </Center>
                ),
                value: 'auto',
              },
            ]}
          />
        </Stack>

        <Stack gap="xs">
          <Text fw={500}>Card View</Text>
          <SegmentedControl
            size="md"
            withItemsBorders={false}
            value={settings.cardView}
            onChange={(value) =>
              updateSetting('cardView', value as 'grid' | 'compact' | 'list')
            }
            data={[
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <BsGrid />
                    <span>Grid</span>
                  </Center>
                ),
                value: 'grid',
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <CiGrid2H />
                    <span>Compact</span>
                  </Center>
                ),
                value: 'compact',
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <BsListUl />
                    <span>List</span>
                  </Center>
                ),
                value: 'list',
              },
            ]}
          />
        </Stack>

        <Stack gap="xs">
          <Text fw={500}>Collection View</Text>
          <SegmentedControl
            size="md"
            withItemsBorders={false}
            value={settings.collectionView}
            onChange={(value) =>
              updateSetting('collectionView', value as 'grid' | 'compact')
            }
            data={[
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <BsGrid />
                    <span>Grid</span>
                  </Center>
                ),
                value: 'grid',
              },
              {
                label: (
                  <Center style={{ gap: 10 }}>
                    <CiGrid2H />
                    <span>Compact</span>
                  </Center>
                ),
                value: 'compact',
              },
            ]}
          />
        </Stack>
      </Stack>
    </Container>
  );
}
