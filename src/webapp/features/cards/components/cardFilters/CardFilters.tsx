import { Group } from '@mantine/core';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function CardsFilters(props: Props) {
  return <Group gap="xs">{props.children}</Group>;
}
