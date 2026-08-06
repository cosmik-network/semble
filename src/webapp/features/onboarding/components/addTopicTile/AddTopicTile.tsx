'use client';

import {
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { TbPlus } from 'react-icons/tb';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import tileStyles from '../topicTile/TopicTile.module.css';

interface Props {
  value: string;
  onChangeValue: (value: string) => void;
  /** Adds the typed topic, or selects the existing tile it matches. */
  onSubmit: () => void;
  submitDisabled: boolean;
  /** Explains a match against a topic that already exists. */
  description?: string;
}

export default function AddTopicTile(props: Props) {
  const [opened, handlers] = useDisclosure(false);

  const submit = () => {
    props.onSubmit();
    handlers.close();
  };

  return (
    <>
      {/*
        The same shape and interaction styles as a topic tile, so it sits in
        the grid as a peer rather than an intruder. Written out rather than
        reusing TopicTile because this opens a dialog rather than toggling a
        topic, so it has no aria-pressed and no selected state to carry.
      */}
      <Card
        component="button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={opened}
        onClick={handlers.open}
        radius={'lg'}
        padding={'md'}
        // Must track TopicTile's mih, or the first cell is a different
        // height to every other one.
        mih={120}
        ta="center"
        className={tileStyles.tile}
        withBorder
        // The one thing that sets it apart: no fill, where every topic tile
        // sits on the body colour. Same border, same shape, same icon — it
        // just recedes a step.
        bg="transparent"
      >
        <Stack gap={'sm'} align="center" justify="center" flex={1}>
          <ThemeIcon variant="light" color="gray" size={'lg'} radius={'xl'}>
            <TbPlus size={18} />
          </ThemeIcon>

          {/* A span, not Text's default <p> — this sits inside a <button>. */}
          <Text component="span" fz={'sm'} fw={600} c={'bright'} lh={1.2}>
            Add your own
          </Text>
        </Stack>
      </Card>

      <Modal
        opened={opened}
        onClose={handlers.close}
        centered
        size="sm"
        title="Add your own topic"
        // The app's shared blurred, tinted overlay — every other modal in the
        // webapp uses it, so this one should not invent its own.
        overlayProps={DEFAULT_OVERLAY_PROPS}
      >
        {/* A real form, so Enter submits natively and the button is a submit
            button — no key handler to keep in sync with the click path. */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (props.submitDisabled) return;
            submit();
          }}
        >
          <Stack gap={'md'}>
            <TextInput
              // Mantine moves focus here on open and back to the tile on
              // close, which is what saves this from needing an effect.
              data-autofocus
              // "Topic", not "Add your own topic" — the dialog title already
              // says that, and repeating it reads as a stutter.
              label="Topic"
              placeholder="mycology, urban planning"
              // The webapp's modal-form field style — EditCollectionModal,
              // ReportCardModal and NoteCardModal all use filled at size md.
              variant="filled"
              size="md"
              description={props.description}
              value={props.value}
              onChange={(event) =>
                props.onChangeValue(event.currentTarget.value)
              }
            />

            {/* The webapp's modal footer pattern — see SubscribeModal and
                AddCardToModal: Cancel stays at its natural width, the
                confirming action takes the rest of the row. */}
            <Group gap={'xs'} wrap="nowrap">
              <Button
                variant="light"
                color="gray"
                size="md"
                onClick={handlers.close}
              >
                Cancel
              </Button>
              {/* Adding is a no-op only when the typed topic is already
                  picked. A match that isn't picked yet stays actionable —
                  submitting selects the existing tile. */}
              <Button
                type="submit"
                size="md"
                style={{ flex: 1 }}
                disabled={props.submitDisabled}
              >
                Add topic
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
