import { Group, Stack, Text, ThemeIcon } from '@mantine/core';
import type { Collection } from '@semble/types';
import { BiCollection } from 'react-icons/bi';

interface Props {
  collection: Collection;
}

// Its tile and tag set it apart from the link rows it's listed with
export default function CollectionOptionRow(props: Props) {
  const count = props.collection.cardCount;

  return (
    <Group gap="xs" wrap="nowrap" w="100%">
      <ThemeIcon variant="light" color="gray" size={35} radius="md">
        <BiCollection size={18} />
      </ThemeIcon>
      <Stack gap={0} flex={1} miw={0}>
        <Text fw={500} c="bright" lineClamp={1} size="sm">
          {props.collection.name}
        </Text>
        <Text c="gray" lineClamp={1} size="xs">
          @{props.collection.author.handle} · {count}{' '}
          {count === 1 ? 'card' : 'cards'}
        </Text>
      </Stack>
      <Text c="dimmed" size="xs">
        Collection
      </Text>
    </Group>
  );
}
