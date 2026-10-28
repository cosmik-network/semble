import { Button, Group, Paper, Text } from '@mantine/core';
import { useReadonly } from 'tldraw';
import useTakeOverCanvas from '../../lib/mutations/useTakeOverCanvas';
import { showCanvasError } from '../../lib/showCanvasError';

interface Props {
  onTakeOver: () => Promise<void>;
}

export default function ReadOnlyBanner(props: Props) {
  const isReadonly = useReadonly();
  const takeOverCanvas = useTakeOverCanvas(props.onTakeOver);

  if (!isReadonly) return null;

  const handleTakeOver = () => {
    takeOverCanvas.mutate(undefined, {
      onError: () => showCanvasError('Could not take over this canvas'),
    });
  };

  return (
    <Paper
      shadow={'sm'}
      radius={'xl'}
      p={4}
      pl={'md'}
      m={'xs'}
      style={{ pointerEvents: 'all' }}
    >
      <Group gap={'sm'} wrap="nowrap">
        <Text fz={'sm'} fw={500}>
          Open elsewhere, take over?
        </Text>
        <Button
          size={'xs'}
          radius={'xl'}
          loading={takeOverCanvas.isPending}
          onClick={handleTakeOver}
        >
          Take over
        </Button>
      </Group>
    </Paper>
  );
}
