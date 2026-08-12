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
      {/* Written out rather than reusing TopicTile: this opens a dialog rather
          than toggling a topic, so it carries no aria-pressed and no selected
          state. */}
      <Card
        component="button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={opened}
        onClick={handlers.open}
        // Radius, padding and inner metrics must all track TopicTile's, or
        // this sits in the row at a different height to its neighbours.
        radius={'xl'}
        padding={0}
        className={tileStyles.tile}
        withBorder
        bg="transparent"
      >
        <Group gap={8} wrap="nowrap" px={10} py={6}>
          <ThemeIcon variant="light" color="gray" size={24} radius={'xl'}>
            <TbPlus size={14} />
          </ThemeIcon>

          {/* A span, not Text's default <p> — this sits inside a <button>. */}
          <Text component="span" fz={'sm'} fw={600} c={'bright'} lh={1.2}>
            Add your own
          </Text>
        </Group>
      </Card>

      <Modal
        opened={opened}
        onClose={handlers.close}
        centered
        size="sm"
        title="Add your own topic"
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
              label="Topic"
              placeholder="mycology, urban planning"
              variant="filled"
              size="md"
              description={props.description}
              value={props.value}
              onChange={(event) =>
                props.onChangeValue(event.currentTarget.value)
              }
            />

            <Group gap={'xs'} wrap="nowrap">
              <Button
                variant="light"
                color="gray"
                size="md"
                onClick={handlers.close}
              >
                Cancel
              </Button>
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
