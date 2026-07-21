import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import { isNotFoundApiError } from '@/api-client/errors';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import CollectionHeader from '@/features/collections/components/collectionHeader/CollectionHeader';
import CollectionHeaderSkeleton from '@/features/collections/components/collectionHeader/Skeleton.CollectionHeader';
import CollectionShareHeaderButton from '@/features/collections/components/CollectionShareHeaderButton/CollectionShareHeaderButton';
import CollectionTabs from '@/features/collections/components/collectionTabs/CollectionTabs';
import { Container } from '@mantine/core';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rkey, handle } = await params;

  const collection = await getCollectionPageByAtUri({
    recordKey: rkey,
    handle: handle,
  }).catch((error: unknown) => {
    // TEMP DIAGNOSTIC — remove after debugging native 404
    console.log('[DIAG collection layout] error:', {
      name: (error as any)?.name,
      status: (error as any)?.statusCode,
      code: (error as any)?.code,
      message: (error as any)?.message,
      apiBase: process.env.NEXT_PUBLIC_API_BASE_URL,
    });
    // Unresolvable handle / missing collection → render the not-found page.
    if (isNotFoundApiError(error, 'COLLECTION_NOT_FOUND')) notFound();
    throw error;
  });

  return {
    title: `${collection.name} (by ${collection.author.name})`,
    description:
      collection.description ??
      `View ${collection.author.name}'s collection on Semble`,
    authors: [
      {
        name: collection.author.name,
        url: `${process.env.APP_URL}/profile/${handle}`,
      },
    ],
    alternates: {
      types: {
        '': `${collection.uri}`,
      },
    },
    other: {
      'atprotocol:creator': `at://${collection.author.id}`,
    },
  };
}

export default async function Layout(props: Props) {
  const { handle, rkey } = await props.params;

  return (
    <Fragment>
      <Header>
        <BackButton />
        <CollectionShareHeaderButton handle={handle} rkey={rkey} />
      </Header>
      <Suspense fallback={<CollectionHeaderSkeleton />}>
        <CollectionHeader handle={handle} rkey={rkey} />
      </Suspense>

      <Container size={'xl'} px={'xs'} mt={'md'}>
        <CollectionTabs handle={handle} rkey={rkey} />
      </Container>
      {props.children}
    </Fragment>
  );
}
