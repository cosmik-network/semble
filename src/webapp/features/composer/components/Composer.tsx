'use client';

import {
  Button,
  Center,
  Container,
  Drawer,
  Flex,
  Group,
  Input,
  ScrollArea,
  Select,
  Stack,
  SegmentedControl,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  VisuallyHidden,
} from '@mantine/core';
import { useState, useEffect, Suspense } from 'react';
import { Collection, CollectionAccessType } from '@semble/types';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useCreateCollection from '@/features/collections/lib/mutations/useCreateCollection';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import { useDisclosure } from '@mantine/hooks';
import { BiCollection } from 'react-icons/bi';
import { IoMdCheckmark, IoMdLink } from 'react-icons/io';
import { track } from '@vercel/analytics';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import { FaSeedling } from 'react-icons/fa6';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { CardSaveSource } from '@/features/analytics/types';
import { usePathname } from 'next/navigation';
import { BsExclamation } from 'react-icons/bs';
import AddConnectionForm from '@/features/connections/components/addConnectionDrawer/AddConnectionForm';
import { TbPlugConnected } from 'react-icons/tb';

type ComposerMode = 'card' | 'collection' | 'connection';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ComposerMode;
  selectedCollection?: Collection;
  initialUrl?: string;
  initialCollectionName?: string;
  initialCollectionAccessType?: CollectionAccessType;
  onCollectionCreate?: () => void;
}

export default function Composer(props: Props) {
  const pathname = usePathname();
  const [mode, setMode] = useState<ComposerMode>(props.initialMode ?? 'card');

  // Card form state
  const [collectionSelectorOpened, { toggle: toggleCollectionSelector }] =
    useDisclosure(false);
  const initialCollections = props.selectedCollection
    ? [props.selectedCollection]
    : [];
  const [selectedCollections, setSelectedCollections] =
    useState(initialCollections);

  const { data: collections } = useMyCollections({ limit: 30 });
  const allCollections =
    collections?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const myCollections = props.selectedCollection
    ? [
        props.selectedCollection,
        ...allCollections.filter((c) => c.id !== props.selectedCollection?.id),
      ]
    : allCollections;

  const addCard = useAddCard({
    saveSource: CardSaveSource.ADD_CARD_DRAWER,
    pagePath: pathname,
  });

  const cardForm = useForm({
    initialValues: {
      url: props.initialUrl || '',
      note: '',
      collections: selectedCollections,
    },
  });

  // Collection form state
  const createCollection = useCreateCollection();
  const collectionForm = useForm({
    initialValues: {
      name: props.initialCollectionName ?? '',
      description: '',
      accessType:
        props.initialCollectionAccessType ?? CollectionAccessType.CLOSED,
    },
  });

  const MAX_NOTE_LENGTH = 500;

  useEffect(() => {
    if (props.initialMode) {
      setMode(props.initialMode);
    }
  }, [props.initialMode]);

  useEffect(() => {
    if (props.initialUrl) {
      cardForm.setValues({ url: props.initialUrl });
    }
  }, [props.initialUrl]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!props.isOpen) {
      cardForm.reset();
      collectionForm.reset();
      setSelectedCollections(initialCollections);
      setMode('card');
    }
  }, [props.isOpen]);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    track('add new card');

    // Capture values before any state changes
    const cardData = {
      url: cardForm.getValues().url,
      note: cardForm.getValues().note,
      collectionIds: selectedCollections.map((c) => c.id),
    };

    // Show loading toast immediately
    const notificationId = `add-card-${Date.now()}`;
    notifications.show({
      id: notificationId,
      loading: true,
      title: 'Adding card...',
      message: 'Please wait',
      position: 'top-center',
      autoClose: false,
      withCloseButton: false,
    });

    // Close drawer immediately
    props.onClose();
    setSelectedCollections(initialCollections);
    window.history.replaceState({}, '', window.location.pathname);
    cardForm.reset();

    addCard.mutate({ ...cardData, notificationId });
  };

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture values before any state changes
    const collectionData = {
      name: collectionForm.getValues().name,
      description: collectionForm.getValues().description,
      accessType: collectionForm.getValues().accessType,
    };

    // Close drawer immediately
    props.onClose();
    if (props.onCollectionCreate) {
      props.onCollectionCreate();
    }
    collectionForm.reset();

    createCollection.mutate(collectionData, {
      onError: () => {
        notifications.show({
          color: 'red',
          title: 'Error',
          message: 'Could not create collection',
          position: 'top-center',
          loading: false,
          autoClose: false,
          withCloseButton: true,
          icon: <BsExclamation />,
        });
      },
    });
  };

  return (
    <>
      <Drawer
        opened={props.isOpen}
        onClose={props.onClose}
        withCloseButton={false}
        size={'36rem'}
        padding={'sm'}
        position="bottom"
        overlayProps={DEFAULT_OVERLAY_PROPS}
        styles={{
          body: { flex: 1, display: 'flex', flexDirection: 'column' },
          content: { display: 'flex', flexDirection: 'column' },
        }}
      >
        <Drawer.Header>
          <Stack gap="md" w="100%">
            <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
              New
            </Drawer.Title>
            <SegmentedControl
              value={mode}
              onChange={(value) => setMode(value as ComposerMode)}
              disabled={addCard.isPending || createCollection.isPending}
              radius={'xl'}
              mx="auto"
              data={[
                {
                  value: 'card',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <FaRegNoteSticky size={16} />
                      <span>Card</span>
                    </Center>
                  ),
                },
                {
                  value: 'collection',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <BiCollection size={16} />
                      <span>Collection</span>
                    </Center>
                  ),
                },
                {
                  value: 'connection',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <TbPlugConnected size={16} />
                      <span>Connection</span>
                    </Center>
                  ),
                },
              ]}
            />
          </Stack>
        </Drawer.Header>

        <Container
          size={'sm'}
          p={0}
          w="100%"
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {mode === 'connection' ? (
            <Suspense>
              <AddConnectionForm onClose={props.onClose} />
            </Suspense>
          ) : mode === 'card' ? (
            <form onSubmit={handleAddCard}>
              <Stack gap={'xl'}>
                <TextInput
                  id="url"
                  label="URL"
                  type="url"
                  placeholder="https://www.example.com"
                  variant="filled"
                  required
                  size="md"
                  leftSection={<IoMdLink size={22} />}
                  data-autofocus
                  key={cardForm.key('url')}
                  {...cardForm.getInputProps('url')}
                />

                <Stack gap={0}>
                  <Flex justify="space-between">
                    <Input.Label size="md" htmlFor="note">
                      Note
                    </Input.Label>
                    <Text c={'gray'} aria-hidden>
                      {cardForm.getValues().note.length} / {MAX_NOTE_LENGTH}
                    </Text>
                  </Flex>

                  <Textarea
                    id="note"
                    placeholder="Add a note about this card"
                    variant="filled"
                    size="md"
                    rows={3}
                    maxLength={MAX_NOTE_LENGTH}
                    aria-describedby="note-char-remaining"
                    key={cardForm.key('note')}
                    {...cardForm.getInputProps('note')}
                  />
                  <VisuallyHidden id="note-char-remaining" aria-live="polite">
                    {`${MAX_NOTE_LENGTH - cardForm.getValues().note.length} characters remaining`}
                  </VisuallyHidden>
                </Stack>

                <Stack gap={5}>
                  <Text fw={500}>
                    Add to collections{' '}
                    {selectedCollections.length > 0 &&
                      `(${selectedCollections.length})`}
                  </Text>
                  <ScrollArea.Autosize
                    type="hover"
                    scrollbars="x"
                    offsetScrollbars={true}
                  >
                    <Group gap={'xs'} wrap="nowrap">
                      <Button
                        onClick={toggleCollectionSelector}
                        variant="light"
                        color={'blue'}
                        leftSection={<BiCollection size={22} />}
                        disabled={addCard.isPending}
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
                            disabled={addCard.isPending}
                            variant="light"
                            color={
                              selectedCollections.some((c) => c.id === col.id)
                                ? 'grape'
                                : 'gray'
                            }
                            rightSection={
                              selectedCollections.some(
                                (c) => c.id === col.id,
                              ) ? (
                                <IoMdCheckmark />
                              ) : null
                            }
                            leftSection={
                              isMarginUri(col.uri) ? (
                                <MarginLogo size={12} marginUrl={marginUrl} />
                              ) : col.accessType ===
                                CollectionAccessType.OPEN ? (
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
                                if (prev.some((c) => c.id === col.id)) {
                                  return prev.filter((c) => c.id !== col.id);
                                }
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
          ) : (
            <form
              onSubmit={handleCreateCollection}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <Stack gap={'xl'} style={{ flex: 1 }}>
                <TextInput
                  id="name"
                  label="Name"
                  type="text"
                  placeholder="Collection name"
                  variant="filled"
                  size="md"
                  required
                  maxLength={100}
                  data-autofocus
                  key={collectionForm.key('name')}
                  {...collectionForm.getInputProps('name')}
                />

                <Textarea
                  id="description"
                  label="Description"
                  placeholder="Describe what this collection is about"
                  variant="filled"
                  size="md"
                  rows={3}
                  maxLength={500}
                  key={collectionForm.key('description')}
                  {...collectionForm.getInputProps('description')}
                />

                <Select
                  variant="filled"
                  size="md"
                  label="Collaboration"
                  leftSection={
                    collectionForm.getValues().accessType ===
                    CollectionAccessType.OPEN ? (
                      <ThemeIcon
                        size={'md'}
                        variant="light"
                        color={'green'}
                        radius={'xl'}
                      >
                        <FaSeedling size={14} />
                      </ThemeIcon>
                    ) : null
                  }
                  allowDeselect={false}
                  defaultValue={CollectionAccessType.CLOSED}
                  data={[
                    {
                      value: CollectionAccessType.CLOSED,
                      label: 'Personal — Only you can add',
                    },
                    {
                      value: CollectionAccessType.OPEN,
                      label: 'Open — Anyone can add',
                    },
                  ]}
                  {...collectionForm.getInputProps('accessType')}
                />

                <Group justify="space-between" gap={'xs'} grow mt="auto">
                  <Button
                    variant="light"
                    size="md"
                    color={'gray'}
                    onClick={props.onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="md"
                    loading={createCollection.isPending}
                  >
                    Create
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Container>
      </Drawer>

      <Drawer
        opened={collectionSelectorOpened}
        onClose={toggleCollectionSelector}
        withCloseButton={false}
        position="bottom"
        padding={'sm'}
        size={'30rem'}
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
    </>
  );
}
