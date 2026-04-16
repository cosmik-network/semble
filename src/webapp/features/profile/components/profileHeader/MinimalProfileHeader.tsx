import BackButton from '@/components/navigation/backButton/BackButton';
import NavbarToggle from '@/components/navigation/NavbarToggle';
import { Group, Avatar, Stack, Title, Text, Container } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import { LinkActionIcon } from '@/components/link/MantineLink';

interface Props {
  avatarUrl?: string;
  name: string;
  handle: string;
}

export default function MinimalProfileHeader(props: Props) {
  return (
    <Container p={'xs'} size={'xl'} mx={0}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap={'sm'} wrap="nowrap">
          <BackButton />
          <Avatar
            src={props.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.name}'s avatar`}
            size={'34'}
          />

          <Stack gap={0}>
            <Title order={1} fz={'xs'} c={'bright'} lineClamp={1}>
              {props.name}
            </Title>
            <Text c="gray" fw={600} fz={'xs'} lineClamp={1}>
              @{props.handle}
            </Text>
          </Stack>
        </Group>

        <Group gap={'xs'} wrap="nowrap">
          <LinkActionIcon
            href={`/search/cards?handle=${props.handle}`}
            variant="light"
            color="gray"
            size={'lg'}
            radius={'xl'}
          >
            <IoSearch />
          </LinkActionIcon>
          <NavbarToggle />
        </Group>
      </Group>
    </Container>
  );
}
