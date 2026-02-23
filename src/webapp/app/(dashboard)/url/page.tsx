import type { Metadata } from 'next';
import { getDomain } from '@/lib/utils/link';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { redirect } from 'next/navigation';
import SemblePageClient from '@/features/semble/containers/sembleContainer/SemblePageClient';
import SembleContainer from '@/features/semble/containers/sembleContainer/SembleContainer';
import { Suspense } from 'react';
import SembleContainerSkeleton from '@/features/semble/containers/sembleContainer/Skeleton.SembleContainer';

interface Props {
  searchParams: Promise<{ id: string | undefined; viaCardId?: string }>;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id: string | undefined; viaCardId?: string }>;
}): Promise<Metadata> {
  const { id: url } = await searchParams;

  if (!url) {
    redirect('/');
  }

  const { metadata } = await getUrlMetadata(url);
  const domain = getDomain(url);
  const title = metadata.title ? `${metadata.title} (${domain})` : url;

  return {
    title: title,
    description: `Semble page for ${title}`,
    openGraph: {
      images: [
        {
          url: `${process.env.APP_URL}/api/opengraph/semble?url=${url}`,
          width: 1200,
          height: 630,
          alt: `Semble page for ${domain}`,
        },
      ],
    },
  };
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const url = searchParams.id;
  const viaCardId = searchParams.viaCardId;

  if (!url) {
    redirect('/');
  }

  return (
    <SemblePageClient viaCardId={viaCardId}>
      <Suspense fallback={<SembleContainerSkeleton />} key={url + 'container'}>
        <SembleContainer url={url} viaCardId={viaCardId} />
      </Suspense>
    </SemblePageClient>
  );
}
