import {
  Group,
  Avatar,
  Stack,
  Title,
  Text,
  Container,
  ActionIcon,
} from '@mantine/core';
import Link from 'next/link';
import { IoSearch } from 'react-icons/io5';

interface Props {
  avatarUrl?: string;
  name: string;
  handle: string;
}

export default function MinimalProfileHeader(props: Props) {
  return (
    <Container p={'xs'} size={'xl'} mx={0}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={'sm'} wrap="nowrap">
          <Avatar
            src={props.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.name}'s avatar`}
            size={'md'}
          />

          <Stack gap={0}>
            <Title order={1} fz={'sm'} c={'bright'} lineClamp={1}>
              {props.name}
            </Title>
            <Text c="gray" fw={600} fz={'sm'} lineClamp={1}>
              @{props.handle}
            </Text>
          </Stack>
        </Group>

        <ActionIcon
          component={Link}
          href={`/search/cards?handle=${props.handle}`}
          variant="light"
          color="gray"
          size={'lg'}
          radius={'xl'}
        >
          <IoSearch />
        </ActionIcon>
      </Group>
    </Container>
  );
}
