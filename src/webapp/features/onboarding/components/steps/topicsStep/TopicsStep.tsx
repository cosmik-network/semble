'use client';

import {
  Button,
  Chip,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useInputState, useListState } from '@mantine/hooks';
import { PRESET_TOPICS } from '../../../lib/topics';

interface Props {
  topics: string[];
  onChangeTopics: (topics: string[]) => void;
}

/** Comparison form only. Never stored and never displayed. */
function normalize(topic: string): string {
  return topic.trim().toLowerCase();
}

/** First occurrence wins, so preset order and preset casing survive. */
function dedupe(topics: string[]): string[] {
  const seen = new Set<string>();

  return topics.filter((topic) => {
    const key = normalize(topic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function TopicsStep(props: Props) {
  // useListState for the append; useInputState so TextInput's onChange takes
  // the setter directly instead of an event-unwrapping closure.
  //
  // This is session state and resets on every mount, so it cannot be the only
  // source of custom chips — props.topics is the persisted one. It is still
  // kept so a custom topic deselected within a session stays on screen and
  // can be re-selected.
  const [customTopics, customTopicsHandlers] = useListState<string>([]);
  const [newTopic, setNewTopic] = useInputState('');

  // Derived every render from all three sources. Without props.topics in here,
  // a custom topic added before a remount (footer Back, refresh, ?step=1 with
  // stored progress) stays selected and counted with no chip to click, so
  // there is no way to deselect it.
  //
  // Chip.Group matches values by exact string, so where a stored topic differs
  // only in case from a preset the stored casing has to win or the chip never
  // lights up. Order still follows the presets.
  const storedByKey = new Map(
    props.topics.map((topic) => [normalize(topic), topic]),
  );

  const allTopics = dedupe([
    ...PRESET_TOPICS,
    ...props.topics,
    ...customTopics,
  ]).map((topic) => storedByKey.get(normalize(topic)) ?? topic);

  const trimmedInput = newTopic.trim();
  const existingTopic = trimmedInput
    ? allTopics.find((topic) => normalize(topic) === normalize(trimmedInput))
    : undefined;
  const isAlreadySelected =
    existingTopic !== undefined && props.topics.includes(existingTopic);

  const handleAddTopic = () => {
    if (!trimmedInput) return;

    // Re-use the existing entry rather than creating a near-duplicate, so
    // typing "ai" selects the preset "AI" instead of spawning a second chip.
    if (existingTopic) {
      if (!isAlreadySelected) {
        props.onChangeTopics([...props.topics, existingTopic]);
      }
      setNewTopic('');
      return;
    }

    customTopicsHandlers.append(trimmedInput);
    props.onChangeTopics([...props.topics, trimmedInput]);
    setNewTopic('');
  };

  const inputDescription = !existingTopic
    ? undefined
    : isAlreadySelected
      ? 'You already picked that topic.'
      : 'That topic is already in the list below.';

  const countLabel =
    props.topics.length === 1
      ? '1 topic selected'
      : `${props.topics.length} topics selected`;

  return (
    <Stack gap={'md'}>
      <Stack gap={4}>
        <Title order={1}>What topics interest you?</Title>
        <Text c={'dimmed'}>
          We use these to suggest cards, people and collections.
        </Text>
      </Stack>

      <Chip.Group multiple value={props.topics} onChange={props.onChangeTopics}>
        <Group gap={'xs'}>
          {allTopics.map((topic) => (
            <Chip key={topic} value={topic} color="green" variant="light">
              {topic}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      {/* flex-end keeps the button on the input's baseline. Mantine renders
          `description` above the input, so the field grows upward and the
          alignment holds whether or not the hint is showing. */}
      <Group gap={'xs'} maw={500} align="flex-end">
        <TextInput
          flex={1}
          label="Add your own topic"
          placeholder="mycology, urban planning"
          description={inputDescription}
          value={newTopic}
          onChange={setNewTopic}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddTopic();
            }
          }}
        />
        <Button
          variant="light"
          color="blue"
          // Adding is a no-op only when the typed topic is already picked.
          // A match that isn't picked yet stays actionable — pressing it
          // selects the existing chip.
          disabled={!trimmedInput || isAlreadySelected}
          onClick={handleAddTopic}
        >
          Add topic
        </Button>
      </Group>

      <Text fz={'sm'} c={'dimmed'}>
        {props.topics.length > 0
          ? countLabel
          : 'Pick at least one topic to continue.'}
      </Text>
    </Stack>
  );
}
