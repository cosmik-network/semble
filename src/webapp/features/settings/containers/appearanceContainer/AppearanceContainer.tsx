'use client';

import { Container, Stack, SegmentedControl, Center } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import {
  MdOutlineDarkMode,
  MdOutlineLightMode,
  MdOutlineSmartphone,
} from 'react-icons/md';

export default function AppearanceContainer() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
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
    </Container>
  );
}
