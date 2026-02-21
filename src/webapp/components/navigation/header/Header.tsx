import { Box, Divider, Group, Paper, Text } from '@mantine/core';
import NavbarToggle from '../NavbarToggle';
import { ReactElement } from 'react';

interface Props {
  title?: string;
  children?: ReactElement;
}

export default function Header(props: Props) {
  return (
    <Paper pos={'sticky'} top={0} radius={0} style={{ zIndex: 1 }}>
      <Group gap={'xs'} p={'xs'} justify="space-between">
        <Group gap={'xs'}>
          {props.children}
          {props.title && (
            <Text fz={'lg'} fw={700} lineClamp={1}>
              {props.title}
            </Text>
          )}
        </Group>
        <NavbarToggle />
      </Group>
      <Divider />
    </Paper>
  );
}
