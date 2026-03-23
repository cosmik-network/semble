import { Suspense } from 'react';
import MyFeedContainer from '@/features/feeds/containers/myFeedContainer/MyFeedContainer';
import MyFeedContainerSkeleton from '@/features/feeds/containers/myFeedContainer/Skeleton.MyFeedContainer';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page(props: Props) {
  const params = await props.searchParams;
  const key = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  ).toString();

  return (
    <Suspense key={key} fallback={<MyFeedContainerSkeleton />}>
      <MyFeedContainer />
    </Suspense>
  );
}
