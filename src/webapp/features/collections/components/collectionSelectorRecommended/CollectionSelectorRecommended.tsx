import { Loader, Stack, Text } from '@mantine/core';
import CollectionSelectorItemList from '../collectionSelectorItemList/CollectionSelectorItemList';
import CollectionSelectorError from '../collectionSelector/Error.CollectionSelector';
import useRecommendedCollectionsForUrl from '../../lib/queries/useRecommendedCollectionsForUrl';
import { Collection } from '@semble/types';
import CollectionListScrollArea, {
  COLLECTION_PANEL_HEIGHT,
} from '../collectionSelector/CollectionListScrollArea';

interface Props {
  url: string;
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelectorRecommended(props: Props) {
  const { data, error, isPending } = useRecommendedCollectionsForUrl({
    url: props.url,
  });

  const collections = data?.collections ?? [];

  const handleCollectionChange = (checked: boolean, item: Collection) => {
    if (checked) {
      if (!props.selectedCollections.some((col) => col.id === item.id)) {
        props.onSelectedCollectionsChange([...props.selectedCollections, item]);
      }
    } else {
      props.onSelectedCollectionsChange(
        props.selectedCollections.filter((col) => col.id !== item.id),
      );
    }
  };

  if (error) {
    return <CollectionSelectorError />;
  }

  return (
    <Stack gap={'sm'} h={COLLECTION_PANEL_HEIGHT}>
      {isPending ? (
        <Stack align="center" justify="center" style={{ flex: 1 }}>
          <Text fw={500} c="gray">
            Finding similar cards in your library...
          </Text>
          <Loader color="gray" />
        </Stack>
      ) : collections.length > 0 ? (
        <CollectionListScrollArea>
          <CollectionSelectorItemList
            collections={collections}
            selectedCollections={props.selectedCollections}
            onChange={handleCollectionChange}
          />
        </CollectionListScrollArea>
      ) : (
        <Stack align="center" justify="center" style={{ flex: 1 }} gap="xs">
          <Text fz="lg" fw={600} c="gray">
            No recommendations
          </Text>
          <Text fz="sm" c="gray" ta="center">
            Save more similar cards to your collections to get recommendations
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
