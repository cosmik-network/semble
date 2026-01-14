'use client';

import { Select } from '@mantine/core';
import { CardSortField } from '@semble/types';

interface Props {
  value: CardSortField;
  onChange: (value: CardSortField) => void;
}

export default function CardsFilters(props: Props) {
  return (
    <Select
      allowDeselect={false}
      variant="filled"
      size="sm"
      value={props.value}
      onChange={(option) => props.onChange(option as CardSortField)}
      data={[
        {
          value: CardSortField.UPDATED_AT,
          label: 'Newest',
        },
        {
          value: CardSortField.CREATED_AT,
          label: 'Oldest',
        },
        {
          value: CardSortField.LIBRARY_COUNT,
          label: 'Most Popular',
        },
      ]}
    />
  );
}
