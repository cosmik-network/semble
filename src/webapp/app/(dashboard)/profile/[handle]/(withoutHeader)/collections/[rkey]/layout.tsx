import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import { truncateText } from '@/lib/utils/text';
import type { Metadata } from 'next';
import { Fragment, Suspense } from 'react';
import CollectionHeader from '@/features/collections/components/collectionHeader/CollectionHeader';
import CollectionHeaderSkeleton from '@/features/collections/components/collectionHeader/Skeleton.CollectionHeader';
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
        <BackButton href={`/profile/${handle}/collections`}>
          {`@${truncateText(handle, 20)}`}
        </BackButton>
      </Header>
      <Suspense fallback={<CollectionHeaderSkeleton />}>
        <CollectionHeader handle={handle} rkey={rkey} />
      </Suspense>

      <Container size={'xl'} p={'xs'}>
        <Suspense>
          <CollectionTabs handle={handle} rkey={rkey} />
        </Suspense>
      </Container>
      {props.children}
    </Fragment>
  );
}
