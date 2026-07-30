'use client';

import { useState } from 'react';
import {
  Button,
  Chip,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

export const PRESET_TOPICS = [
  'science',
  'AI',
  'software development',
  'community',
  'atproto',
  'social networks',
  'music',
  'writing',
  'note-taking',
  'personal knowledge management',
  'politics',
  'curation',
  'product building',
  'business',
  'nature',
];

interface Props {
  selectedTopics: string[];
  onChangeTopics: (topics: string[]) => void;
  onContinue: () => void;
  onSkip: () => void;
}

export default function TopicsPane(props: Props) {
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');

  const allTopics = [
    ...PRESET_TOPICS,
    ...customTopics.filter((t) => !PRESET_TOPICS.includes(t)),
  ];

  const handleAddTopic = () => {
    const topic = newTopic.trim();
    if (!topic) return;
    if (!allTopics.includes(topic)) {
      setCustomTopics([...customTopics, topic]);
    }
    if (!props.selectedTopics.includes(topic)) {
      props.onChangeTopics([...props.selectedTopics, topic]);
    }
    setNewTopic('');
  };

  return (
    <Stack gap={'md'}>
      <Stack gap={4}>
        <Title order={1}>What are your interests?</Title>
        <Text c={'gray'}>
          We’ll use this to help you find content and curators that might
          interest you.
        </Text>
      </Stack>

      <Chip.Group
        multiple
        value={props.selectedTopics}
        onChange={props.onChangeTopics}
      >
        <Group gap={'xs'}>
          {allTopics.map((topic) => (
            <Chip key={topic} value={topic} color="green" variant="light">
              {topic}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      <Group gap={'xs'} maw={500}>
        <TextInput
          flex={1}
          placeholder="Add your own topic of interest (can be detailed!)"
          value={newTopic}
          onChange={(e) => setNewTopic(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTopic();
            }
          }}
        />
        <Button variant="light" color="blue" onClick={handleAddTopic}>
          Add
        </Button>
      </Group>

      <Text fz={'sm'} c={'gray'}>
        {props.selectedTopics.length > 0
          ? `${props.selectedTopics.length} topic${props.selectedTopics.length === 1 ? '' : 's'} selected`
          : 'Choose a few topics to personalize your results.'}
      </Text>

      <Group justify="space-between">
        <Button variant="subtle" color="gray" onClick={props.onSkip}>
          Skip
        </Button>
        <Button
          color="dark"
          onClick={props.onContinue}
          disabled={props.selectedTopics.length === 0}
        >
          Continue
        </Button>
      </Group>
    </Stack>
  );
}
