'use client';

import { Badge, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useInputState, useListState } from '@mantine/hooks';
import { PRESET_TOPICS, TOPICS } from '../../../lib/topics';
import AddTopicTile from '../../addTopicTile/AddTopicTile';
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

export default function TopicsStep(props: Props) {
  // useListState for the append; useInputState so TextInput's onChange takes
  // the setter directly instead of an event-unwrapping closure.
  //
  // This is session state and resets on every mount, so it cannot be the only
  // source of custom tiles — props.topics is the persisted one. It is still
  // kept so a custom topic deselected within a session stays on screen and
  // can be re-selected.
  const [customTopics, customTopicsHandlers] = useListState<string>([]);
  const [newTopic, setNewTopic] = useInputState('');

  // Selection is matched on the normalized form, so a stored "ai" lights up
  // the preset "AI" rather than sitting invisibly beside it. The map keeps the
  // stored casing, which is what has to be removed on deselect.
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

  // Derived every render from both sources. Without props.topics in here, a
  // custom topic added before a remount (footer Back, refresh, ?step=1 with
  // stored progress) would have no tile to click, so there would be no way to
  // deselect it.
  //
  // Reversed, and rendered ahead of the presets: a topic you just typed should
  // appear next to the tile you typed it into, not appended below fifteen
  // suggestions you have already scanned past. `filter` returns a fresh array,
  // so reversing it in place touches nothing else.
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

  // Custom topics are tiles too, so adding one raises the denominator as well
  // as the numerator — the ratio always describes what is actually on screen.
  const totalTopics = TOPICS.length + customTopicList.length;

  return (
    // One measure for the whole stage. The screen's Container is `md` (960px),
    // which is far too wide for a four-column grid of small tiles — they end up
    // as letterboxes with the icon adrift in them, on a different width to the
    // hero above. 720 keeps a tile close to square at every breakpoint.
    <Stack gap={'xl'} maw={720} w={'100%'} mx={'auto'}>
      {/* Narrower than the grid on purpose: this is a text measure. */}
      <Stack gap={4} align="center" maw={480} mx={'auto'}>
        <Title order={1} ta={'center'}>
          Pick a few topics
        </Title>
        <Text c={'dimmed'} ta={'center'}>
          We use them to suggest cards, people and collections.
        </Text>

        {/* The fixed height reserves the row, so nothing shifts when the badge
            appears — which is what lets it render nothing at all until stored
            progress has been read, rather than flashing 0/15 for a frame. */}
        <Group justify="center" h={26} mt={4}>
          {props.progressLoaded && (
            <Badge
              radius={'xl'}
              variant="light"
              // Same accent as the tiles, so the count and the grid read as
              // one thing rather than two colour schemes.
              color={props.topics.length > 0 ? TOPIC_COLOR : 'gray'}
            >
              {props.topics.length}/{totalTopics}
            </Badge>
          )}
        </Group>
      </Stack>

      <SimpleGrid
        role="group"
        aria-label="Topics"
        cols={{ base: 2, xs: 3, sm: 4 }}
        spacing={'xs'}
      >
        {/* First, not last: it is the one tile whose position should not move
            as custom topics accumulate, and putting it up front makes it the
            first thing Tab reaches. Whatever you add lands immediately after
            it. */}
        <AddTopicTile
          value={newTopic}
          onChangeValue={setNewTopic}
          onSubmit={handleAddTopic}
          // Adding is a no-op only when the typed topic is already picked. A
          // match that isn't picked yet stays actionable — submitting selects
          // the existing tile.
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
      </SimpleGrid>
    </Stack>
  );
}
