import { Stack, Text, Center } from '@mantine/core';
import { BiSearch } from 'react-icons/bi';

interface Props {
  query: string;
  type?: 'cards' | 'profiles';
}

export default function SearchEmptyResults(props: Props) {
  const type = props.type || 'results';

  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <BiSearch size={48} opacity={0.5} />
        <Text size="lg" fw={500} c="dimmed">
          No results found
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          No {type} found for "{props.query}". Try a different search term.
        </Text>
      </Stack>
    </Center>
  );
}
