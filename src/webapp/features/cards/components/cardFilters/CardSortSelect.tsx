'use client';

import { CardSortField } from '@semble/types';
import { Select } from '@mantine/core';
import { useOptimistic, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CardSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const sortFromUrl =
    (searchParams.get('sort') as CardSortField) ?? CardSortField.UPDATED_AT;

  const [optimisticSort, setOptimisticSort] =
    useOptimistic<CardSortField>(sortFromUrl);

  const onChange = (next: CardSortField) => {
    startTransition(() => {
      setOptimisticSort(next);

      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', next);

      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Select
      allowDeselect={false}
      variant="filled"
      size="sm"
      value={optimisticSort}
      onChange={(v) => onChange(v as CardSortField)}
      data={[
        { value: CardSortField.UPDATED_AT, label: 'Newest' },
        { value: CardSortField.CREATED_AT, label: 'Oldest' },
        { value: CardSortField.LIBRARY_COUNT, label: 'Most Popular' },
      ]}
    />
  );
}
