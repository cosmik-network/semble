'use client';

import { CloseButton, TextInput } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ExploreSearchInput(props: Props) {
  return (
    <TextInput
      variant="filled"
      aria-label="Search"
      placeholder="Search..."
      leftSection={<IoSearch />}
      rightSection={
        <CloseButton
          aria-label="Clear input"
          onClick={() => props.onChange('')}
          style={{ display: props.value ? undefined : 'none' }}
        />
      }
      radius="xl"
      value={props.value}
      onChange={(e) => props.onChange(e.currentTarget.value)}
      w={200}
    />
  );
}
