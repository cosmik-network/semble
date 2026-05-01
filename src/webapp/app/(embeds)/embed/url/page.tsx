import type { Metadata } from 'next';
import { getDomain } from '@/lib/utils/link';
import { redirect } from 'next/navigation';
import SemblePageClient from '@/features/semble/containers/sembleContainer/SemblePageClient';
import SembleContainer from '@/features/semble/containers/sembleContainer/SembleContainer';
import { Suspense } from 'react';
import SembleContainerSkeleton from '@/features/semble/containers/sembleContainer/Skeleton.SembleContainer';

interface Props {
  searchParams: Promise<{ id: string | undefined; viaCardId?: string }>;
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const url = searchParams.id
    ? decodeURIComponent(searchParams.id)
    : searchParams.id;
  const viaCardId = searchParams.viaCardId;

  if (!url) {
    redirect('/');
  }

  return (
    <Suspense fallback={<SembleContainerSkeleton />} key={url + 'container'}>
      <SemblePageClient viaCardId={viaCardId}>
        <SembleContainer url={url} viaCardId={viaCardId} hideActions />
      </SemblePageClient>
    </Suspense>
  );
}
