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
    title: `People who added ${collection.name}`,
    description:
      collection.description ??
      `See who has added ${collection.name} to their collections`,
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

export default function Layout(props: Props) {
  return props.children;
}
