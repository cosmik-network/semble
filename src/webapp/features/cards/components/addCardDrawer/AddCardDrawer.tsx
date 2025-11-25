import {
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useAddCard from '../../lib/mutations/useAddCard';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import { Suspense, useState } from 'react';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import { useDisclosure } from '@mantine/hooks';
import { BiCollection } from 'react-icons/bi';
import { IoMdLink } from 'react-icons/io';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { track } from '@vercel/analytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCollection?: SelectableCollectionItem;
}

export default function AddCardDrawer(props: Props) {
  const [collectionSelectorOpened, { toggle: toggleCollectionSelector }] =
    useDisclosure(false);
  const initialCollections = props.selectedCollection
    ? [props.selectedCollection]
    : [];
  const [selectedCollections, setSelectedCollections] =
    useState(initialCollections);

  const hasNoCollections = selectedCollections.length === 0;
  const hasOneCollection = selectedCollections.length === 1;

  const addCard = useAddCard();

  const form = useForm({
    initialValues: {
      url: '',
      note: '',
      collections: selectedCollections,
    },
  });

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    track('add new card');

    addCard.mutate(
      {
        url: form.getValues().url,
        note: form.getValues().note,
        collectionIds: selectedCollections.map((c) => c.id),
      },
      {
        onSuccess: () => {
          setSelectedCollections([]);
          props.onClose();
        },
        onError: () => {
          notifications.show({
            message: 'Could not add card.',
          });
        },
        onSettled: () => {
          form.reset();
        },
      },
    );
  };

  return (
    <Drawer
      opened={props.isOpen}
      onClose={() => {
        props.onClose();
      }}
      withCloseButton={false}
      position="bottom"
      overlayProps={DEFAULT_OVERLAY_PROPS}
    >
      <Drawer.Header>
        <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
          New Card
        </Drawer.Title>
      </Drawer.Header>
      <Container size={'sm'} p={0}>
        <form onSubmit={handleAddCard}>
          <Stack gap={'xl'}>
            <Stack>
              <Stack>
                <TextInput
                  id="url"
                  label="URL"
                  type="url"
                  placeholder="https://www.example.com"
                  variant="filled"
                  required
                  size="md"
                  leftSection={<IoMdLink size={22} />}
                  key={form.key('url')}
                  {...form.getInputProps('url')}
                />

                <Textarea
                  id="note"
                  label="Note"
                  placeholder="Add a note about this card"
                  variant="filled"
                  size="md"
                  rows={3}
                  maxLength={500}
                  key={form.key('note')}
                  {...form.getInputProps('note')}
                />
              </Stack>

              <Group>
                <Stack align="start" gap={'xs'}>
                  <Tooltip
                    label={selectedCollections.map((c) => c.name).join(', ')}
                    disabled={hasNoCollections}
                  >
                    <Button
                      onClick={toggleCollectionSelector}
                      variant="light"
                      color={hasNoCollections ? 'gray' : 'grape'}
                      leftSection={<BiCollection size={22} />}
                    >
                      {!hasNoCollections
                        ? `${selectedCollections.length} ${hasOneCollection ? 'collection' : 'collections'}`
                        : 'Add to collections'}
                    </Button>
                  </Tooltip>
                </Stack>
              </Group>

              <Drawer
                opened={collectionSelectorOpened}
                onClose={toggleCollectionSelector}
                withCloseButton={false}
                position="bottom"
                size={'29rem'}
                overlayProps={DEFAULT_OVERLAY_PROPS}
              >
                <Drawer.Header>
                  <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
                    Add to collections
                  </Drawer.Title>
                </Drawer.Header>
                <Container size={'xs'} p={0}>
                  <Suspense fallback={<CollectionSelectorSkeleton />}>
                    <CollectionSelector
                      isOpen={collectionSelectorOpened}
                      onCancel={() => {
                        setSelectedCollections([]);
                        toggleCollectionSelector();
                      }}
                      onClose={toggleCollectionSelector}
                      onSave={toggleCollectionSelector}
                      selectedCollections={selectedCollections}
                      onSelectedCollectionsChange={setSelectedCollections}
                    />
                  </Suspense>
                </Container>
              </Drawer>
            </Stack>
            <Group justify="space-between" gap={'xs'} grow>
              <Button
                variant="light"
                size="md"
                color={'gray'}
                onClick={props.onClose}
              >
                Cancel
              </Button>
              <Button type="submit" size="md" loading={addCard.isPending}>
                Add card
              </Button>
            </Group>
          </Stack>
        </form>
      </Container>
    </Drawer>
  );
}
