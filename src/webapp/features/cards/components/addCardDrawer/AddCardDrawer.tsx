import {
  Button,
  Container,
  Drawer,
  Flex,
  Group,
  Input,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  VisuallyHidden,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useAddCard from '../../lib/mutations/useAddCard';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import { Suspense, useEffect, useState } from 'react';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import { useDisclosure } from '@mantine/hooks';
import { BiCollection } from 'react-icons/bi';
import { IoMdCheckmark, IoMdLink } from 'react-icons/io';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { track } from '@vercel/analytics';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import { Collection, CollectionAccessType } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCollection?: Collection;
  initialUrl?: string;
}

export default function AddCardDrawer(props: Props) {
  const [collectionSelectorOpened, { toggle: toggleCollectionSelector }] =
    useDisclosure(false);
  const initialCollections = props.selectedCollection
    ? [props.selectedCollection]
    : [];
  const [selectedCollections, setSelectedCollections] =
    useState(initialCollections);

  const { data: collections } = useMyCollections({ limit: 30 });
  const myCollections =
    collections?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const addCard = useAddCard();

  const form = useForm({
    initialValues: {
      url: props.initialUrl || '',
      note: '',
      collections: selectedCollections,
    },
  });

  const maxNoteLength = 500;
  const { note } = form.getValues();

  useEffect(() => {
    if (props.initialUrl) {
      form.setValues({ url: props.initialUrl });
    }
  }, [props.initialUrl]);

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
          setSelectedCollections(initialCollections);
          props.onClose();
          window.history.replaceState({}, '', window.location.pathname);
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
      size={'29rem'}
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

                <Stack gap={0}>
                  <Flex justify="space-between">
                    <Input.Label size="md" htmlFor="note">
                      Note
                    </Input.Label>
                    <Text aria-hidden>
                      {note?.length ?? 0} / {maxNoteLength}
                    </Text>
                  </Flex>

                  <Textarea
                    id="note"
                    placeholder="Add a note about this card"
                    variant="filled"
                    size="md"
                    rows={3}
                    maxLength={maxNoteLength}
                    aria-describedby="note-char-remaining"
                    key={form.key('note')}
                    {...form.getInputProps('note')}
                  />
                  <VisuallyHidden id="note-char-remaining" aria-live="polite">
                    {`${maxNoteLength - (note?.length ?? 0)} characters remaining`}
                  </VisuallyHidden>
                </Stack>
              </Stack>

              <Stack gap={5}>
                <Text fw={500}>
                  Add to collections{' '}
                  {selectedCollections.length > 0 &&
                    `(${selectedCollections.length})`}
                </Text>
                <ScrollArea.Autosize type="hover" scrollbars="x">
                  <Group gap={'xs'} wrap="nowrap">
                    <Button
                      onClick={toggleCollectionSelector}
                      variant="light"
                      color={'blue'}
                      leftSection={<BiCollection size={22} />}
                    >
                      {myCollections.length === 0
                        ? 'Create a collection'
                        : 'Manage & Create'}
                    </Button>

                    {myCollections.map((col) => {
                      const marginUrl = getMarginUrl(
                        col.uri,
                        col.author?.handle,
                      );
                      return (
                        <Button
                          key={col.id}
                          variant="light"
                          color={
                            selectedCollections.some((c) => c.id === col.id)
                              ? 'grape'
                              : 'gray'
                          }
                          rightSection={
                            selectedCollections.some((c) => c.id === col.id) ? (
                              <IoMdCheckmark />
                            ) : null
                          }
                          leftSection={
                            isMarginUri(col.uri) ? (
                              <MarginLogo size={12} marginUrl={marginUrl} />
                            ) : col.accessType === CollectionAccessType.OPEN ? (
                              <ThemeIcon
                                variant="light"
                                radius={'xl'}
                                size={'xs'}
                                color="green"
                              >
                                <FaSeedling size={8} />
                              </ThemeIcon>
                            ) : undefined
                          }
                          onClick={() => {
                            setSelectedCollections((prev) => {
                              // already selected, remove
                              if (prev.some((c) => c.id === col.id)) {
                                return prev.filter((c) => c.id !== col.id);
                              }
                              // not selected, add it
                              return [...prev, col];
                            });
                          }}
                        >
                          {col.name}
                        </Button>
                      );
                    })}
                  </Group>
                </ScrollArea.Autosize>
              </Stack>

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
                        setSelectedCollections(initialCollections);
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
                onClick={() => {
                  props.onClose();
                  setSelectedCollections(initialCollections);
                }}
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
