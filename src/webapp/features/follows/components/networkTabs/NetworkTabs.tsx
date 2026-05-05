'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { Button, Group, ScrollArea, Scroller } from '@mantine/core';

const tabs = [
  { label: 'Followers', value: 'followers' },
  { label: 'Following', value: 'following' },
  { label: 'Collections Following', value: 'collections-following' },
  { label: 'Contributed To', value: 'contributed-to' },
];

export default function NetworkTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handle = params.handle as string;

  const basePath = `/profile/${handle}/network`;

  // Determine active tab from URL
  const getCurrentValue = () => {
    if (pathname === basePath) return 'followers';
    if (pathname.endsWith('/following')) return 'following';
    if (pathname.endsWith('/collections-following'))
      return 'collections-following';
    if (pathname.endsWith('/contributed-to')) return 'contributed-to';
    return 'followers';
  };

  const currentValue = getCurrentValue();

  return (
    <Scroller>
      <Group gap="xs" wrap="nowrap">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            size="xs"
            color="gray"
            variant={currentValue === tab.value ? 'filled' : 'light'}
            onClick={() => {
              if (tab.value === 'followers') {
                router.push(basePath);
              } else {
                router.push(`${basePath}/${tab.value}`);
              }
            }}
          >
            {tab.label}
          </Button>
        ))}
      </Group>
    </Scroller>
  );
}
