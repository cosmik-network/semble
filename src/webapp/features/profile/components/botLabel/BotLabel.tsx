import { Tooltip, ThemeIcon } from '@mantine/core';
import { RiRobot2Fill } from 'react-icons/ri';

export default function BotLabel() {
  return (
    <Tooltip label="Bot account">
      <ThemeIcon size={'xs'} variant="transparent" color="gray" radius={'xl'}>
        <RiRobot2Fill size={16} />
      </ThemeIcon>
    </Tooltip>
  );
}
