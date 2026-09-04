'use client';

import { usePathname, useParams } from 'next/navigation';
import { Group, Scroller } from '@mantine/core';
import { LinkButton } from '@/components/link/MantineLink';

const tabs = [
  { label: 'Followers', segment: '' },
  { label: 'Following', segment: 'following' },
  { label: 'Collections Following', segment: 'collections-following' },
  { label: 'Contributed To', segment: 'contributed-to' },
];

export default function NetworkTabs() {
  const pathname = usePathname();
  const { handle } = useParams<{ handle: string }>();

  const basePath = `/profile/${handle}/network`;

  return (
    <Scroller>
      <Group gap="xs" wrap="nowrap">
        {tabs.map((tab) => {
          const href = tab.segment ? `${basePath}/${tab.segment}` : basePath;

          return (
            <LinkButton
              key={tab.label}
              href={href}
              size="xs"
              color="gray"
              variant={pathname === href ? 'filled' : 'light'}
            >
              {tab.label}
            </LinkButton>
          );
        })}
      </Group>
    </Scroller>
  );
}
