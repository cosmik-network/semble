'use client';

import {
  Button,
  Drawer,
  Flex,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  VisuallyHidden,
  Container,
  Scroller,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useAddCard from '../../lib/mutations/useAddCard';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import { Suspense, useEffect, useRef, useState } from 'react';
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
import { CardSaveSource } from '@/features/analytics/types';
import { usePathname } from 'next/navigation';
import UrlSearchInput from '@/features/connections/components/addConnectionDrawer/UrlSearchInput';

interface Props {
  onClose: () => void;
  selectedCollection?: Collection;
  initialUrl?: string;
}

export default function AddCardForm(props: Props) {
  const pathname = usePathname();
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

  // Put selectedCollection first, then others
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

  const rawUrlInput = useRef(props.initialUrl ?? '');

  const form = useForm({
    initialValues: {
      url: props.initialUrl || '',
      note: '',
      collections: selectedCollections,
    },
    validateInputOnChange: false,
    validateInputOnBlur: true,
    validate: {
      url: (value) => {
        if (!value || value.trim() === '') {
          return 'URL is required';
        }
        try {
          new URL(value);
          return null;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
  });

  const MAX_NOTE_LENGTH = 500;

  useEffect(() => {
    if (props.initialUrl) {
      form.setValues({ url: props.initialUrl });
      rawUrlInput.current = props.initialUrl;
    }
  }, [props.initialUrl]);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-confirm a valid URL that was typed/pasted but not explicitly selected
    if (!form.values.url && rawUrlInput.current) {
      try {
        new URL(rawUrlInput.current);
        form.setFieldValue('url', rawUrlInput.current);
      } catch {
        // let validation handle it
      }
    }

    const validation = form.validate();
    if (validation.hasErrors) return;

    track('add new card');

    // Capture values before any state changes
    const cardData = {
      url: form.getValues().url,
      note: form.getValues().note,
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
    rawUrlInput.current = '';
    form.reset();

    addCard.mutate({ ...cardData, notificationId });
  };

  return (
    <>
      <form onSubmit={handleAddCard}>
        <Stack gap={'xl'}>
          <UrlSearchInput
            id="url"
            label="URL"
            placeholder="Search or paste a link"
            value={form.values.url}
            error={form.errors.url}
            onUrlSelect={(url) => form.setFieldValue('url', url)}
            onUrlClear={() => {
              rawUrlInput.current = '';
              form.setFieldValue('url', '');
            }}
            onInputChange={(raw) => {
              rawUrlInput.current = raw;
            }}
            inputProps={{
              variant: 'filled',
              size: 'md',
              leftSection: <IoMdLink size={22} />,
            }}
          />

          <Stack gap={0}>
            <Flex justify="space-between">
              <Input.Label size="md" htmlFor="note">
                Note
              </Input.Label>
              <Text c={'gray'} aria-hidden>
                {form.getValues().note.length} / {MAX_NOTE_LENGTH}
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
              key={form.key('note')}
              {...form.getInputProps('note')}
            />
            <VisuallyHidden id="note-char-remaining" aria-live="polite">
              {`${MAX_NOTE_LENGTH - form.getValues().note.length} characters remaining`}
            </VisuallyHidden>
          </Stack>

          <Stack gap={5}>
            <Text fw={500}>
              Add to collections{' '}
              {selectedCollections.length > 0 &&
                `(${selectedCollections.length})`}
            </Text>
            <Scroller>
              <Group gap={'xs'} wrap="nowrap">
                <Button
                  disabled={addCard.isPending}
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
                  const marginUrl = getMarginUrl(col.uri, col.author?.handle);
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
            </Scroller>
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
