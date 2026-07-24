'use client';

import { useId } from 'react';
import { Box, Button, ButtonGroup, Collapse } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IoChevronDown } from 'react-icons/io5';

interface Props {
  label: string;
  /** Pass a rendered element, not an icon component — this is a client
   * component, so function props can't cross the server/client boundary. */
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export default function SettingItemGroup(props: Props) {
  const [expanded, { toggle }] = useDisclosure(props.defaultExpanded ?? false);
  const contentId = useId();

  return (
    <Box>
      <Button
        variant="light"
        size="md"
        justify="space-between"
        radius={'lg'}
        color="gray"
        fullWidth
        leftSection={props.icon}
        rightSection={
          <IoChevronDown
            size={18}
            style={{
              transform: expanded ? 'rotate(180deg)' : undefined,
              transition: 'transform 200ms ease',
            }}
          />
        }
        styles={{ label: { flexGrow: 1, textAlign: 'left' } }}
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        my={1}
      >
        {props.label}
      </Button>
      <Collapse expanded={expanded} id={contentId}>
        <Box pt={1}>
          <ButtonGroup orientation="vertical">{props.children}</ButtonGroup>
        </Box>
      </Collapse>
    </Box>
  );
}
