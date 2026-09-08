'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Anchor, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { FiPlus } from 'react-icons/fi';
import { IoMdCheckmark } from 'react-icons/io';
import { TbExternalLink, TbPlugConnected } from 'react-icons/tb';
import { useAuth } from '@/hooks/useAuth';
import { getLoginPathWithRedirect } from '@/lib/auth/redirect';
import { getDomain } from '@/lib/utils/link';
import { useSuspenseUrlMetadataWithStats } from '@/features/cards/lib/queries/useUrlMetadata';
import type { ReaderLink } from '../../lib/utils/readerLink';
import ReaderLinkActionsSkeleton from './Skeleton.ReaderLinkActions';

interface Props {
  link: ReaderLink;
  onAdd: () => void;
  onConnect: () => void;
}

interface ViewProps extends Props {
  title: string;
  inLibrary?: boolean;
  isConnected?: boolean;
  libraryCount?: number;
  connectionCount?: number;
}

function View(props: ViewProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const requireAuth = (action: () => void) => () => {
    if (!isAuthenticated) {
      router.push(getLoginPathWithRedirect());
      return;
    }
    action();
  };

  const libraryCount = props.libraryCount ?? 0;
  const connectionCount = props.connectionCount ?? 0;
  const saveIcon = props.inLibrary ? (
    <IoMdCheckmark size={18} />
  ) : (
    <FiPlus size={18} />
  );
  const connectIcon = <TbPlugConnected size={15} />;

  return (
    <Stack gap="sm">
      <Stack gap={0}>
        <Tooltip label={props.link.href}>
          <Anchor
            href={props.link.href}
            target="_blank"
            rel="noopener noreferrer"
            c="dimmed"
            fz="xs"
            fw={500}
            lineClamp={1}
            w="fit-content"
          >
            {getDomain(props.link.href)}
          </Anchor>
        </Tooltip>
        <Text fw={600} c="bright" size="sm" lineClamp={2}>
          {props.title}
        </Text>
      </Stack>

      <Group gap="xs" wrap="nowrap">
        <Tooltip label="Save or update" withArrow>
          <Button
            variant="light"
            color="gray"
            size="xs"
            radius="xl"
            leftSection={libraryCount > 0 ? saveIcon : undefined}
            onClick={requireAuth(props.onAdd)}
          >
            {libraryCount > 0 ? libraryCount : saveIcon}
          </Button>
        </Tooltip>
        <Tooltip label="Connect to another card" withArrow>
          <Button
            variant="light"
            color={props.isConnected ? 'green' : 'gray'}
            size="xs"
            radius="xl"
            leftSection={connectionCount > 0 ? connectIcon : undefined}
            onClick={requireAuth(props.onConnect)}
          >
            {connectionCount > 0 ? connectionCount : connectIcon}
          </Button>
        </Tooltip>
        <Button
          component="a"
          href={props.link.href}
          target="_blank"
          rel="noopener noreferrer"
          variant="subtle"
          color="gray"
          size="xs"
          radius="xl"
          rightSection={<TbExternalLink size={15} />}
        >
          Open
        </Button>
      </Group>
    </Stack>
  );
}

function Loaded(props: Props) {
  // Invalidated by the save and connect mutations, so the checkmark flips right away
  const { data } = useSuspenseUrlMetadataWithStats({ url: props.link.href });

  return (
    <View
      {...props}
      title={data.metadata.title || props.link.text}
      inLibrary={data.urlInLibrary}
      isConnected={data.urlIsConnected}
      libraryCount={data.stats?.libraryCount}
      connectionCount={data.stats?.connections.all.total}
    />
  );
}

export default function ReaderLinkActions(props: Props) {
  return (
    <ErrorBoundary
      // Metadata can fail; saving should still work
      fallback={<View {...props} title={props.link.text} />}
    >
      <Suspense fallback={<ReaderLinkActionsSkeleton />}>
        <Loaded {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
