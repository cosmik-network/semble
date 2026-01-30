'use client';

import { ReactNode, useEffect, startTransition, useRef } from 'react';
import { Center, Button, Stack, Loader, Divider } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';

interface Props {
  children: ReactNode;
  dataLength: number;
  hasMore: boolean;
  isInitialLoading: boolean;
  isLoading: boolean;
  loadMore: () => void;
  loader?: ReactNode;
  manualLoadButton?: boolean;
}

export default function InfiniteScroll(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref, entry } = useIntersection({
    root: containerRef.current,
    threshold: 0,
  });

  const { hasMore, isLoading, loadMore } = props;

  useEffect(() => {
    startTransition(() => {
      if (entry?.isIntersecting && hasMore && !isLoading) {
        loadMore();
      }
    });
  }, [entry?.isIntersecting, hasMore, isLoading, loadMore]);

  return (
    <Stack w={'100%'}>
      {props.children}
      {props.isLoading &&
        (props.loader || (
          <Center>
            <Loader />
          </Center>
        ))}

      <Center ref={ref}>
        {!props.isLoading && props.hasMore && props.manualLoadButton && (
          <Button loading={props.isLoading} onClick={props.loadMore}>
            Load more
          </Button>
        )}
      </Center>

      {!props.hasMore && !isLoading && props.dataLength !== 0 && (
        <Center mt={'xl'}>
          <Divider label="The end" w={200} />
        </Center>
      )}
    </Stack>
  );
}
