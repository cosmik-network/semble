import { Group, Stack, Text, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  /** Rendered on the right, before "View all". */
  actions?: ReactNode;
}

export default function ExploreSectionHeader(props: Props) {
  return (
    <Stack gap={0}>
      <Group justify="space-between" wrap="nowrap" align="center">
        <Group gap="xs" wrap="nowrap">
          {props.icon}
          <Title order={2}>{props.title}</Title>
        </Group>
        <Group gap="xs" wrap="nowrap">
          {props.actions}
          {props.viewAllHref && (
            <LinkButton variant="light" color="blue" href={props.viewAllHref}>
              View all
            </LinkButton>
          )}
        </Group>
      </Group>
      {props.subtitle && (
        <Text fw={500} fz={'lg'}>
          {props.subtitle}
        </Text>
      )}
    </Stack>
  );
}
