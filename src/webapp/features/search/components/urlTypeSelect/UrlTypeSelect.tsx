'use client';

import { Button, Group, Popover, type PopoverProps } from '@mantine/core';
import { upperFirst } from '@mantine/hooks';
import { useState } from 'react';
import { MdFilterList } from 'react-icons/md';
import { UrlType } from '@semble/types';
import { getUrlTypeIcon, renderUrlTypeIcon } from '@/lib/utils/icon';

interface Props {
  value: UrlType | null;
  onChange: (value: UrlType | null) => void;
  position?: PopoverProps['position'];
  withinPortal?: boolean;
}

export default function UrlTypeSelect(props: Props) {
  const [opened, setOpened] = useState(false);

  const select = (value: UrlType | null) => {
    props.onChange(value);
    setOpened(false);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position={props.position ?? 'top-start'}
      withinPortal={props.withinPortal}
      shadow="sm"
    >
      <Popover.Target>
        <Button
          variant="light"
          color="lime"
          leftSection={
            props.value === null ? (
              <MdFilterList />
            ) : (
              renderUrlTypeIcon(props.value)
            )
          }
          onClick={() => setOpened((o) => !o)}
        >
          {props.value ? upperFirst(props.value) : 'All Cards'}
        </Button>
      </Popover.Target>

      <Popover.Dropdown maw={300}>
        <Group gap={6}>
          <Button
            size="xs"
            color="lime"
            variant={props.value === null ? 'filled' : 'light'}
            onClick={() => select(null)}
          >
            All Cards
          </Button>

          {Object.values(UrlType).map((type) => {
            const Icon = getUrlTypeIcon(type);

            return (
              <Button
                key={type}
                size="xs"
                color="lime"
                variant={props.value === type ? 'filled' : 'light'}
                leftSection={<Icon />}
                onClick={() => select(type)}
              >
                {upperFirst(type)}
              </Button>
            );
          })}
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
