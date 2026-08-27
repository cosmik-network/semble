import { Stack, Text } from '@mantine/core';
import { ReactNode } from 'react';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import { EXPLORE_SECTIONS, ExploreSection } from '../../lib/exploreSections';

interface Props {
  section: ExploreSection;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** A titled explore section. The shelf and its skeleton both render through
 * this, so the header is written once per section. */
export default function ExploreShelf(props: Props) {
  const section = EXPLORE_SECTIONS[props.section];

  return (
    <Stack>
      <ExploreSectionHeader
        icon={section.icon}
        title={section.title}
        subtitle={props.subtitle ?? section.subtitle}
        viewAllHref={section.viewAllHref}
        actions={props.actions}
      />
      {props.children}
    </Stack>
  );
}

export function ExploreShelfEmpty(props: { message: string }) {
  return (
    <Stack align="center" gap="xs">
      <Text fz="h3" fw={600} c="gray">
        {props.message}
      </Text>
    </Stack>
  );
}
