import { Stack, Text, Center, Title } from '@mantine/core';
import { BiSearch } from 'react-icons/bi';

interface Props {
  query: string;
  type?: 'cards' | 'profiles' | 'collections';
}

export default function SearchEmptyResults(props: Props) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <BiSearch size={48} opacity={0.5} />
        <Stack align="center" gap={0}>
          <Title order={2} size={'h3'} fw={600} c="dimmed">
            No {props.type} found
          </Title>
          <Text fw={500} c="dimmed" ta="center">
            Try a different search term
          </Text>
        </Stack>
      </Stack>
    </Center>
  );
}
