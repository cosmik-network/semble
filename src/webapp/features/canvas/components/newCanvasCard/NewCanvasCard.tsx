import { Card, Center, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { NEW_CANVAS_HREF } from '../../lib/constants';

export default function NewCanvasCard() {
  return (
    <Card
      component={Link}
      href={NEW_CANVAS_HREF}
      prefetch={false}
      withBorder
      radius={'lg'}
      p={'sm'}
      h={'100%'}
      mih={200}
      style={{ borderStyle: 'dashed' }}
    >
      <Center h={'100%'}>
        <Stack align="center" gap={4} c="gray">
          <FiPlus size={28} />
          <Text fw={500}>New canvas</Text>
        </Stack>
      </Center>
    </Card>
  );
}
