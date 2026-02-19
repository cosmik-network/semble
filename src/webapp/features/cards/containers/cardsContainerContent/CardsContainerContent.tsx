import { CardSortField, SortOrder, UrlType } from '@semble/types';
import CardsContainerSkeleton from '../cardsContainer/Skeleton.CardsContainer';
import CardsContainerError from '../cardsContainer/Error.CardsContainer';
import { Container, Grid } from '@mantine/core';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '../../components/urlCard/UrlCard';
import useCards from '../../lib/queries/useCards';
import { useNavbarContext } from '@/providers/navbar';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { useSearchParams, usePathname } from 'next/navigation';
import { CardSaveSource } from '@/features/analytics/types';

interface Props {
  handle: string;
}

const sortOrderMap: Record<CardSortField, SortOrder> = {
  [CardSortField.UPDATED_AT]: SortOrder.DESC,
  [CardSortField.CREATED_AT]: SortOrder.ASC,
  [CardSortField.LIBRARY_COUNT]: SortOrder.DESC,
};

export default function CardsContainerContent(props: Props) {
  const pathname = usePathname();
  const { desktopOpened } = useNavbarContext();
  const { settings } = useUserSettings();

  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;

  const sortBy =
    (searchParams.get('sort') as CardSortField) ?? CardSortField.UPDATED_AT;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useCards({
    didOrHandle: props.handle,
    sortBy: sortBy,
    sortOrder: sortOrderMap[sortBy],
    urlType: selectedUrlType,
  });

  const allCards = data?.pages.flatMap((page) => page.cards ?? []) ?? [];

  if (isPending) {
    return <CardsContainerSkeleton />;
  }

  if (error) {
    return <CardsContainerError />;
  }

  if (allCards.length === 0) {
    return (
      <Container px="xs" py={'xl'} size="xl">
        <ProfileEmptyTab
          message={selectedUrlType ? `No ${selectedUrlType} cards` : 'No cards'}
          icon={FaRegNoteSticky}
        />
      </Container>
    );
  }

  return (
    <InfiniteScroll
      dataLength={allCards.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Grid gutter="xs">
        {allCards.map((card) => (
          <Grid.Col
            key={card.id}
            span={{
              base: 12,
              xs: settings.cardView !== 'grid' ? 12 : desktopOpened ? 12 : 6,
              sm: settings.cardView !== 'grid' ? 12 : desktopOpened ? 6 : 4,
              md: settings.cardView !== 'grid' ? 12 : 4,
              lg: settings.cardView !== 'grid' ? 12 : 3,
            }}
          >
            <UrlCard
              id={card.id}
              url={card.url}
              uri={card.uri}
              cardContent={card.cardContent}
              note={card.note}
              authorHandle={props.handle}
              cardAuthor={card.author}
              urlLibraryCount={card.urlLibraryCount}
              urlIsInLibrary={card.urlInLibrary}
              viaCardId={card.id}
              analyticsContext={{
                saveSource: CardSaveSource.PROFILE,
                activeFilters: {
                  urlType: selectedUrlType,
                  sort: sortBy,
                },
                pagePath: pathname,
              }}
            />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
