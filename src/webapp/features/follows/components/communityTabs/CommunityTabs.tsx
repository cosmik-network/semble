'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { SegmentedControl } from '@mantine/core';

export default function CommunityTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handle = params.handle as string;

  const basePath = `/profile/${handle}/community`;

  // Determine active tab from URL
  const getCurrentValue = () => {
    if (pathname === basePath) return 'followers';
    if (pathname.endsWith('/following')) return 'following';
    if (pathname.endsWith('/collections-following'))
      return 'collections-following';
    return 'followers';
  };

  return (
    <SegmentedControl
      value={getCurrentValue()}
      onChange={(value) => {
        if (value === 'followers') {
          router.push(basePath);
        } else {
          router.push(`${basePath}/${value}`);
        }
      }}
      data={[
        { label: 'Followers', value: 'followers' },
        { label: 'Following', value: 'following' },
        { label: 'Collections Following', value: 'collections-following' },
      ]}
    />
  );
}
