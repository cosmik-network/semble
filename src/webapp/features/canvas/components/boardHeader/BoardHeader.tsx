'use client';

import { ActionIcon, Group, Paper, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { IoArrowBack } from 'react-icons/io5';
import { useNavHistory } from '@/providers/navHistory';

interface Props {
  title: string;
}

export default function BoardHeader(props: Props) {
  const { canGoBack } = useNavHistory();
  const router = useRouter();

  // A board opened from a link has no history to go back to
  const goBack = () => (canGoBack ? router.back() : router.replace('/home'));

  return (
    <Paper
      shadow="sm"
      radius="xl"
      p={4}
      pr="md"
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          onClick={goBack}
          variant="subtle"
          size="lg"
          color="gray"
          radius="xl"
          aria-label="Go back"
        >
          <IoArrowBack />
        </ActionIcon>
        <Text fw={600} lineClamp={1}>
          {props.title}
        </Text>
      </Group>
    </Paper>
  );
}
