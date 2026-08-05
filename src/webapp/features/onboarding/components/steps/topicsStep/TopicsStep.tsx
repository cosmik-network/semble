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

export default function TopicsStep(props: Props) {
  // useListState for the append; useInputState so TextInput's onChange takes
  // the setter directly instead of an event-unwrapping closure.
  const [customTopics, customTopicsHandlers] = useListState<string>([]);
  const [newTopic, setNewTopic] = useInputState('');

  const allTopics = [
    ...PRESET_TOPICS,
    ...customTopics.filter((topic) => !PRESET_TOPICS.includes(topic)),
  ];

  const handleAddTopic = () => {
    const topic = newTopic.trim();
    if (!topic) return;

    if (!allTopics.includes(topic)) {
      customTopicsHandlers.append(topic);
    }
    if (!props.topics.includes(topic)) {
      props.onChangeTopics([...props.topics, topic]);
    }
    setNewTopic('');
  };

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

      <Group gap={'xs'} maw={500} align="flex-end">
        <TextInput
          flex={1}
          label="Add your own topic"
          placeholder="mycology, urban planning"
          value={newTopic}
          onChange={setNewTopic}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddTopic();
            }
          }}
        />
        <Button variant="light" color="blue" onClick={handleAddTopic}>
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
