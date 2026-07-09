import { ActionIcon, Card, Group, Text } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';

/**
 * Purely presentational search bar for the landing hero. Mirrors the real
 * SearchBar's shape (Card + input + submit icon) but does nothing on click —
 * it's decorative, so it avoids the real component's router/analytics coupling.
 */
export default function DecorativeSearchBar() {
  return (
    <Card
      pr="6"
      py="6"
      pl="md"
      radius="lg"
      w="100%"
      withBorder
      style={{
        borderWidth: '1.5px',
        borderColor:
          'light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
        boxShadow: '0 6px 22px -6px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Group gap="xs" justify="space-between" wrap="nowrap" w="100%">
        <Text c="bright" fz="md" flex={1} lineClamp={1}>
          digital gardens
        </Text>
        <ActionIcon
          size="lg"
          radius="xl"
          component="div"
          variant="transparent"
          color="gray"
          aria-hidden
        >
          <IoSearch size={20} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
