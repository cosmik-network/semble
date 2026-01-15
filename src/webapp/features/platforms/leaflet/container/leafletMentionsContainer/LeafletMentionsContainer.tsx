import SembleMentionsContainerError from '@/features/semble/containers/sembleMentionsContainer/Error.SembleMentionsContainer';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { Grid } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import useSearchLeafletDocs from '../../lib/queries/useSearchLeafletDocs';

interface Props {
  url: string;
}

export default function LeafletMentionsContainer(props: Props) {
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSearchLeafletDocs({ url: props.url });

  const allUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  if (error) {
    return <SembleMentionsContainerError />;
  }

  if (allUrls.length === 0) {
    return (
      <SembleEmptyTab
        message="No mentions found"
        icon={MdOutlineAlternateEmail}
      />
    );
  }

  return (
    <InfiniteScroll
      dataLength={allUrls.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Grid gutter="sm" mx={'auto'} maw={600}>
        {allUrls.map((urlView) => (
          <Grid.Col key={urlView.url} span={12}>
            <SimilarUrlCard urlView={urlView} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
