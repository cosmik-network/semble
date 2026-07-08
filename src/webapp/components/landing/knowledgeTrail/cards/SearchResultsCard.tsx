import { Box, Card, Group, Stack, Text } from '@mantine/core';
import { searchResults } from '../mockData';

// Tiny decorative "favicon"/preview tile shown at the end of each result row.
function ResultThumb() {
  return (
    <Box
      w={26}
      h={26}
      style={{
        flexShrink: 0,
        borderRadius: 'var(--mantine-radius-sm)',
        background:
          'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
      }}
    />
  );
}

/**
 * Decorative search-results list for the "Discover relevant content" trail
 * stop. Presentational only — mirrors the stacked-result look with mock rows,
 * the last of which is "expanded" to reveal a result title.
 */
export default function SearchResultsCard() {
  return (
    <Card
      withBorder
      radius="lg"
      p={6}
      style={{
        boxShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Stack gap={2}>
        {searchResults.map((result) => (
          <Group
            key={result.domain}
            justify="space-between"
            wrap="nowrap"
            gap="sm"
            px="sm"
            py={result.title ? 'xs' : 6}
            style={{
              borderRadius: 'var(--mantine-radius-md)',
              background: result.title
                ? 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))'
                : 'transparent',
            }}
          >
            <Stack gap={2} flex={1} style={{ overflow: 'hidden' }}>
              <Text c="dimmed" fz="sm" truncate>
                {result.domain}
              </Text>
              {result.title && (
                <Text c="bright" fw={600} fz="sm" truncate>
                  {result.title}
                </Text>
              )}
            </Stack>
            <ResultThumb />
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
