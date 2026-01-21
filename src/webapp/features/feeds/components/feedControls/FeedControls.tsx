'use client';

import {
  ScrollAreaAutosize,
  Combobox,
  useCombobox,
  Button,
  Group,
} from '@mantine/core';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BiCollection } from 'react-icons/bi';
import FeedFilters from '../feedFilters/FeedFilters';

const options = [
  { value: 'explore', label: 'Latest', href: '/explore' },
  {
    value: 'gems-of-2025',
    label: '💎 Gems of 2025 💎',
    href: '/explore/gems-of-2025',
  },
];

export default function FeedControls() {
  const pathname = usePathname();
  const router = useRouter();

  const segment = pathname.split('/')[2];
  const currentValue = segment || 'explore';
  const isGemsFeed = currentValue === 'gems-of-2025';

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const selected = options.find((o) => o.value === currentValue);

  return (
    <ScrollAreaAutosize type="scroll">
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <Group gap={'xs'} wrap="nowrap">
          <Combobox
            store={combobox}
            onOptionSubmit={(value) => {
              const option = options.find((o) => o.value === value);
              if (option) {
                router.push(option.href);
              }
              combobox.closeDropdown();
            }}
            width={200}
          >
            <Combobox.Target>
              <Button
                variant="light"
                color="gray"
                leftSection={<Combobox.Chevron />}
                onClick={() => combobox.toggleDropdown()}
              >
                {selected?.label || 'Select feed'}
              </Button>
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>
                {options.map((option) => (
                  <Combobox.Option
                    key={option.value}
                    value={option.value}
                    active={option.value === currentValue}
                  >
                    {option.label}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
          {isGemsFeed && (
            <Button
              variant="light"
              color="grape"
              component={Link}
              href={'/explore/gems-of-2025/collections'}
              leftSection={<BiCollection size={18} />}
            >
              Gem Collections
            </Button>
          )}
        </Group>
        <FeedFilters />
      </Group>
    </ScrollAreaAutosize>
  );
}
