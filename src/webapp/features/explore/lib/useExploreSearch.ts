'use client';

import { useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

const DEBOUNCE_MS = 300;

export default function useExploreSearch() {
  const [value, setValue] = useState('');
  const [debounced] = useDebouncedValue(value, DEBOUNCE_MS);

  // Debounce typing, but clear instantly — otherwise clearing the field leaves
  // search results on screen for another 300ms.
  const query = value.trim() === '' ? '' : debounced.trim();

  return { value, setValue, query, isSearching: query.length > 0 };
}
