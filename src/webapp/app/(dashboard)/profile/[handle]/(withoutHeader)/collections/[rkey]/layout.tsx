import { getCollectionPageByAtUri } from '@/features/collections/lib/dal';
import type { Metadata } from 'next';

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
  return <>{props.children}</>;
}
