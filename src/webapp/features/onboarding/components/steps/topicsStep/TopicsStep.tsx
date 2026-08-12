'use client';

import { Group, Progress, Stack, Text, Title } from '@mantine/core';
import { useInputState, useListState } from '@mantine/hooks';
import { PRESET_TOPICS, TOPICS } from '../../../lib/topics';
import AddTopicTile from '../../addTopicTile/AddTopicTile';
import StepHeading from '../../stepHeading/StepHeading';
import TopicTile from '../../topicTile/TopicTile';
import {
  CUSTOM_TOPIC_ICON,
  TOPIC_COLOR,
  TOPIC_ICONS,
} from '../../topicTile/topicVisuals';

interface Props {
  topics: string[];
  onChangeTopics: (topics: string[]) => void;
  /** False until stored progress has been read — see useOnboardingProgress. */
  progressLoaded: boolean;
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

const PRESET_KEYS = new Set(PRESET_TOPICS.map(normalize));

/** A target, not a requirement — Continue only asks for one topic. */
const TOPIC_GOAL = 2;

export default function TopicsStep(props: Props) {
  // Session state, reset on every mount — props.topics is the persisted one.
  // Kept so a topic deselected within a session stays on screen.
  const [customTopics, customTopicsHandlers] = useListState<string>([]);
  const [newTopic, setNewTopic] = useInputState('');

  // Matched on the normalized form, so a stored "ai" lights up the preset
  // "AI". The map keeps the stored casing, which is what deselect removes.
  const selectedByKey = new Map(
    props.topics.map((topic) => [normalize(topic), topic]),
  );

  const isSelected = (query: string) => selectedByKey.has(normalize(query));

  const toggle = (query: string) => {
    const key = normalize(query);

    if (selectedByKey.has(key)) {
      props.onChangeTopics(
        props.topics.filter((topic) => normalize(topic) !== key),
      );
      return;
    }

    props.onChangeTopics([...props.topics, query]);
  };

  // props.topics has to be in here or a custom topic added before a remount
  // has no tile to click and no way to be deselected. Reversed so a topic you
  // just typed appears next to the tile you typed it into.
  const customTopicList = dedupe([...props.topics, ...customTopics])
    .filter((topic) => !PRESET_KEYS.has(normalize(topic)))
    .reverse();

  const allTopics = dedupe([
    ...PRESET_TOPICS,
    ...props.topics,
    ...customTopics,
  ]);

  const trimmedInput = newTopic.trim();
  const existingTopic = trimmedInput
    ? allTopics.find((topic) => normalize(topic) === normalize(trimmedInput))
    : undefined;
  const isAlreadySelected =
    existingTopic !== undefined && isSelected(existingTopic);

  const handleAddTopic = () => {
    if (!trimmedInput) return;

    // Re-use the existing entry rather than creating a near-duplicate, so
    // typing "ai" selects the preset "AI" instead of spawning a second tile.
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
      : 'That topic is already in the grid.';

  const pickedCount = props.topics.length;
  const goalReached = pickedCount >= TOPIC_GOAL;

  // A full string per branch rather than one assembled around the number: word
  // order and plural rules differ by language.
  const goalLabel =
    pickedCount === 0
      ? `Pick ${TOPIC_GOAL} for the best suggestions`
      : goalReached
        ? 'Good to go — pick more if you like'
        : `${pickedCount} of ${TOPIC_GOAL} picked`;

  return (
    // No measure of its own: OnboardingScreen's Container sets one width for
    // every stage, and clamping inside that shifts the heading's x.
    <Stack gap={'xl'} w={'100%'}>
      <Stack gap={'xs'}>
        <StepHeading
          title="Pick a few topics"
          description="We use them to suggest cards, people and collections."
        />

        {/* The fixed height reserves the row, so the meter can render nothing
            until stored progress has been read rather than flashing "Pick 2" at
            someone who already picked five. */}
        <Group h={26} gap={'sm'} wrap="nowrap">
          {props.progressLoaded && (
            <>
              <Progress
                value={(Math.min(pickedCount, TOPIC_GOAL) / TOPIC_GOAL) * 100}
                w={72}
                size="sm"
                radius={'xl'}
                color={TOPIC_COLOR}
                transitionDuration={200}
                aria-hidden="true"
              />
              <Text
                fz={'sm'}
                fw={goalReached ? 600 : 500}
                c={goalReached ? 'bright' : 'dimmed'}
              >
                {goalLabel}
              </Text>
            </>
          )}
        </Group>
      </Stack>

      {/* A wrapping row, not a grid: every tile is as wide as its own label. */}
      <Group role="group" aria-label="Topics" gap={'xs'}>
        {/* First, not last: the one tile whose position should not move as
            custom topics accumulate. */}
        <AddTopicTile
          value={newTopic}
          onChangeValue={setNewTopic}
          onSubmit={handleAddTopic}
          // A match that isn't picked yet stays actionable.
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
