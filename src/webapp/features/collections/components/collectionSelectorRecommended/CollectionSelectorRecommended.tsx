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
  const recommended = useRecommendedCollectionsForUrl({ url: props.url });

  const myCollections = recommended.data?.myCollections ?? [];
  const openCollections = recommended.data?.openCollections ?? [];

  const hasAny = myCollections.length > 0 || openCollections.length > 0;

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

  if (recommended.error) {
    return <CollectionSelectorError />;
  }

  return (
    <Stack gap={'sm'} h={COLLECTION_PANEL_HEIGHT}>
      {recommended.isPending ? (
        <Stack align="center" justify="center" style={{ flex: 1 }}>
          <Text fw={500} c="gray">
            Recommending collections...
          </Text>
          <Loader color="gray" />
        </Stack>
      ) : hasAny ? (
        <CollectionListScrollArea>
          <Stack gap="xs">
            {myCollections.length > 0 && (
              <Stack gap="xxs">
                <Text fz="sm" fw={600} c="gray">
                  Your collections
                </Text>
                <CollectionSelectorItemList
                  collections={myCollections}
                  selectedCollections={props.selectedCollections}
                  onChange={handleCollectionChange}
                />
              </Stack>
            )}
            {openCollections.length > 0 && (
              <Stack gap="xxs">
                <Text fz="sm" fw={600} c="gray">
                  Open collections
                </Text>
                <CollectionSelectorItemList
                  collections={openCollections}
                  selectedCollections={props.selectedCollections}
                  onChange={handleCollectionChange}
                />
              </Stack>
            )}
          </Stack>
        </CollectionListScrollArea>
      ) : (
        <Stack align="center" justify="center" style={{ flex: 1 }} gap="xs">
          <Text fz="lg" fw={600} c="gray">
            No recommendations
          </Text>
          <Text fz="sm" c="gray" ta="center">
            Save more cards to your collections to get recommendations
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
