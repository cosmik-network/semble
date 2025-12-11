'use client';

import { Container, Stack, SegmentedControl, Center } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { MdDarkMode, MdLightMode, MdOutlineSmartphone } from 'react-icons/md';

export default function AppearanceContainer() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <SegmentedControl
          size="md"
          value={colorScheme}
          onChange={(value) =>
            setColorScheme(value as 'light' | 'dark' | 'auto')
          }
          data={[
            {
              label: (
                <Center style={{ gap: 10 }}>
                  <MdLightMode />
                  <span>Light</span>
                </Center>
              ),
              value: 'light',
            },
            {
              label: (
                <Center style={{ gap: 10 }}>
                  <MdDarkMode />
                  <span>Dark</span>
                </Center>
              ),
              value: 'dark',
            },
            {
              label: (
                <Center style={{ gap: 10 }}>
                  <MdOutlineSmartphone />
                  <span>System</span>
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
