'use client';

import { Group, Stack } from '@mantine/core';
import { useInputState, useListState } from '@mantine/hooks';
import {
  PRESET_TOPICS,
  TOPICS,
  dedupeTopics,
  normalizeTopic,
} from '../../../lib/topics';
import useOnboardingState from '../../../lib/useOnboardingState';
import AddTopicTile from '../../addTopicTile/AddTopicTile';
import GoalProgress from '../../goalProgress/GoalProgress';
import StepHeading from '../../stepHeading/StepHeading';
import TopicTile from '../../topicTile/TopicTile';
import { CUSTOM_TOPIC_ICON, TOPIC_ICONS } from '../../topicTile/topicVisuals';

const PRESET_KEYS = new Set(PRESET_TOPICS.map(normalizeTopic));

const TOPIC_GOAL = 2;

export default function TopicsStep() {
  const { state, isLoaded, stage } = useOnboardingState();

  const topics = state.topicsSelected ?? [];

  const changeTopics = (next: string[]) => stage({ topicsSelected: next });

  // Session state, so a custom topic deselected within a session keeps its
  // tile. `topics` is the persisted list.
  const [customTopics, customTopicsHandlers] = useListState<string>([]);
  const [newTopic, setNewTopic] = useInputState('');

  // Keyed on the normalized form so a stored "ai" lights up the preset "AI",
  // holding the stored casing, which is what deselect removes.
  const selectedByKey = new Map(
    topics.map((topic) => [normalizeTopic(topic), topic]),
  );

  const isSelected = (query: string) =>
    selectedByKey.has(normalizeTopic(query));

  const toggle = (query: string) => {
    const key = normalizeTopic(query);

    if (selectedByKey.has(key)) {
      changeTopics(topics.filter((topic) => normalizeTopic(topic) !== key));
      return;
    }

    changeTopics([...topics, query]);
  };

  // `topics` has to be in here or a custom topic added before a remount has no
  // tile to click.
  const customTopicList = dedupeTopics([...topics, ...customTopics])
    .filter((topic) => !PRESET_KEYS.has(normalizeTopic(topic)))
    .reverse();

  const allTopics = dedupeTopics([
    ...PRESET_TOPICS,
    ...topics,
    ...customTopics,
  ]);

  const trimmedInput = newTopic.trim();
  const existingTopic = trimmedInput
    ? allTopics.find(
        (topic) => normalizeTopic(topic) === normalizeTopic(trimmedInput),
      )
    : undefined;
  const isAlreadySelected =
    existingTopic !== undefined && isSelected(existingTopic);

  const handleAddTopic = () => {
    if (!trimmedInput) return;

    if (existingTopic) {
      if (!isAlreadySelected) {
        changeTopics([...topics, existingTopic]);
      }
      setNewTopic('');
      return;
    }

    customTopicsHandlers.append(trimmedInput);
    changeTopics([...topics, trimmedInput]);
    setNewTopic('');
  };

  const inputDescription = !existingTopic
    ? undefined
    : isAlreadySelected
      ? 'You already picked that topic.'
      : 'That topic is already in the grid.';

  return (
    <Stack gap={'xl'} w={'100%'}>
      <Stack gap={'xs'}>
        <StepHeading
          title="Pick a few topics"
          description="This helps us find interesting content to get you started."
        />

        {/* Fixed height so the label arriving does not shift the grid. */}
        <Group h={26}>
          {isLoaded && (
            <GoalProgress picked={topics.length} goal={TOPIC_GOAL} />
          )}
        </Group>
      </Stack>

      <Group role="group" aria-label="Topics" gap={'xs'}>
        <AddTopicTile
          value={newTopic}
          onChangeValue={setNewTopic}
          onSubmit={handleAddTopic}
          submitDisabled={!trimmedInput || isAlreadySelected}
          description={inputDescription}
        />

        {customTopicList.map((topic) => (
          <TopicTile
            key={topic}
            label={topic}
            icon={CUSTOM_TOPIC_ICON}
            selected={isSelected(topic)}
            onToggle={() => toggle(topic)}
          />
        ))}

        {TOPICS.map((topic) => (
          <TopicTile
            key={topic.id}
            label={topic.label}
            icon={TOPIC_ICONS[topic.id]}
            selected={isSelected(topic.query)}
            onToggle={() => toggle(topic.query)}
          />
        ))}
      </Group>
    </Stack>
  );
}
