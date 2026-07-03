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
    title: `${collection.name}'s followers`,
    description:
      collection.description ?? `View ${collection.name}'s followers on Semble`,
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
      'at:author': `at://${collection.author.id}`,
      'at:canonical': `at://${collection.author.id}/network.cosmik.collection/${collection.id}`,
    },
  };
}

export default function Layout(props: Props) {
  return props.children;
}
