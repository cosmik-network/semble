import { getDomain } from '@/lib/utils/link';
import { Tooltip, Anchor, Group, Skeleton } from '@mantine/core';

import { RiArrowRightUpLine } from 'react-icons/ri';
import { Suspense } from 'react';
import UrlTypeBadgeContent from './UrlTypeBadgeContent';


interface Props {
  url: string;
}

export default function UrlTypeBadge({ url }: Props) {
  return (
    <Group gap={'xs'}>
      <Suspense fallback={<Skeleton w={60} h={20} radius={'xl'} />}>
        <UrlTypeBadgeContent url={url} />
      </Suspense>
      <Tooltip label={url}>
        <Anchor
          target="_blank"
          fw={700}
          c="blue"
          href={url}
          style={{ display: 'inline-block' }}
        >
          <Group gap={0} align="center" wrap="nowrap">
            {getDomain(url)}
            <RiArrowRightUpLine />
          </Group>
        </Anchor>
      </Tooltip>
    </Group>
  );
}
