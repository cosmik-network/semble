import { Box, Card, Group, Image, Paper, Stack, Text } from '@mantine/core';
import { searchResults } from '../mockData';

// Tiny favicon tile shown at the end of each result row. Falls back to a plain
// tinted box (via the Box background) if the favicon fails to load.
function ResultThumb({ src }: { src: string }) {
  return (
    <Paper
      w={30}
      h={30}
      p={5}
      bg={'gray.1'}
    >
      <Image src={src} alt="" w="100%" h="100%" fit="contain"  />
    </Paper>
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
            <ResultThumb src={result.faviconUrl} />
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
