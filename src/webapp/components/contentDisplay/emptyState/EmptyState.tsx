import { Stack, Text, Box } from '@mantine/core';
import { IconType } from 'react-icons/lib';

interface Props {
  message: string;
  icon?: IconType;
  description?: string;
  button?: React.ReactElement;
}

export default function EmptyState(props: Props) {
  return (
    <Stack align="center" gap="xs">
      <Stack gap={0} align="center">
        {props.icon && (
          <Box c={'gray'}>
            <props.icon size={40} />
          </Box>
        )}
        <Text fz="lg" fw={600} c="gray" ta={'center'} maw={320}>
          {props.message}
        </Text>
        {props.description && (
          <Text fz="sm" fw={500} c="gray" ta={'center'} maw={320}>
            {props.description}
          </Text>
        )}
      </Stack>
      {props.button}
    </Stack>
  );
}
