import { Stack, Text, Box } from '@mantine/core';
import { IconType } from 'react-icons/lib';

interface Props {
  message: string;
  icon: IconType;
  button?: React.ReactElement;
}

export default function ProfileEmptyTab(props: Props) {
  return (
    <Stack align="center" gap="xs">
      <Stack gap={0} align="center">
        <Box c={'gray'}>
          <props.icon size={40} />
        </Box>
        <Text fz="lg" fw={600} c="gray" ta={'center'}>
          {props.message}
        </Text>
      </Stack>
      {props.button}
    </Stack>
  );
}
