import { ActionIcon, Box, Group, Text } from '@mantine/core';
import { IoClose } from 'react-icons/io5';

const tabs = [
  { name: 'The web is a knowledge graph', active: false },
  { name: 'Turning bookmarks into trails', active: true },
  { name: 'Mapping the web together', active: false },
];

export default function BrowserTabs() {
  return (
    <Box
      px="xs"
      py={6}
      w="100%"
      maw={800}
      mx="auto"
      style={{
        borderRadius: 'var(--mantine-radius-lg)',
        background:
          'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))',
      }}
    >
      <Group gap={2} justify="center" align="flex-end" wrap="nowrap">
        {tabs.map((tab, i) => (
          <Box
            key={i}
            px="sm"
            py={tab.active ? 'sm' : 'xs'}
            w={200}
            style={{
              borderRadius: 'var(--mantine-radius-lg)',
              background: tab.active
                ? 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))'
                : 'transparent',
              border: tab.active
                ? '1.5px solid var(--mantine-color-tangerine-6)'
                : '1.5px solid transparent',
              boxShadow: tab.active
                ? '0 8px 24px -6px rgba(255, 100, 0, 0.45)'
                : 'none',
              opacity: tab.active ? 1 : 0.7,
              position: 'relative',
              zIndex: tab.active ? 1 : 0,
              flexShrink: 0,
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <Box
                w={14}
                h={14}
                style={{
                  flexShrink: 0,
                  borderRadius: 'var(--mantine-radius-xl)',
                  background: tab.active
                    ? 'var(--mantine-color-tangerine-6)'
                    : 'light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))',
                }}
              />
              <Text
                size="sm"
                fw={tab.active ? 600 : 500}
                c={tab.active ? undefined : 'dimmed'}
                truncate
                style={{ flex: 1 }}
              >
                {tab.name}
              </Text>
              <ActionIcon
                component="div"
                variant="subtle"
                color="gray"
                size="xs"
                radius="xl"
                style={{ flexShrink: 0 }}
                aria-label="Close tab"
              >
                <IoClose size={14} />
              </ActionIcon>
            </Group>
          </Box>
        ))}
      </Group>
    </Box>
  );
}
