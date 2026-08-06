'use client';

import type { ReactNode } from 'react';
import { Card, Group, Stack, Text } from '@mantine/core';
import { FaBluesky } from 'react-icons/fa6';

/**
 * Bluesky's brand blue, as already inlined in `BlueskyPlatformIcon` and
 * `BlueskyMentionPost`. Deliberately not a Mantine palette colour: the theme
 * overrides `blue` with a cyan of its own, so `color="blue"` renders something
 * that is recognisably not Bluesky.
 */
const BLUESKY_BLUE = '#0085ff';

interface Props {
  /** Avatar for a person, icon for a collection — the caller decides which. */
  media: ReactNode;
  title: string;
  /** `@handle` for a person, `by @handle · N cards` for a collection. */
  meta: string;
  description?: string;
  /**
   * "Followed on Bluesky" / "Author followed on Bluesky". Omitted when there
   * is no such link. Always rendered with the Bluesky mark, so the wording is
   * the only thing that varies.
   */
  blueskyNote?: string;
  /** The FollowButton. Passed in so this component owns no follow state. */
  action: ReactNode;
}

/**
 * One suggestion, whether it is a person or a collection.
 *
 * Stage 3 used to render the two differently — people as full-width rows,
 * collections as a grid of `CollectionCard` with the follow button tacked on
 * underneath in a separate row. Two shapes for one decision ("do I want this
 * in my feed?") made the stage read as two unrelated lists, and the detached
 * button read as an afterthought. One card, one grid, one place the action
 * lives.
 */
export default function FollowSuggestionCard(props: Props) {
  return (
    <Card withBorder radius={'lg'} p={'sm'} h={'100%'}>
      <Stack gap={'xs'}>
        {/* Identity and the action share the top row, so the button lands in
            the same place on every card and can be hit down the column
            without re-aiming. */}
        <Group gap={'xs'} wrap="nowrap" align="center">
          {props.media}

          <Stack gap={0} miw={0} flex={1}>
            <Text fw={600} c={'bright'} fz={'sm'} lineClamp={1}>
              {props.title}
            </Text>
            <Text c={'dimmed'} fz={'xs'} lineClamp={1}>
              {props.meta}
            </Text>
          </Stack>

          {props.action}
        </Group>

        {/* Below the row rather than beside it: at two columns the top row has
            no width left for prose, and a description that clamps to one word
            is worse than none. */}
        {props.description && (
          <Text fz={'xs'} c={'dimmed'} lineClamp={2}>
            {props.description}
          </Text>
        )}

        {/* The mark plus the platform's own blue, rather than a filled pill.
            A badge here read as a status chip competing with the follow
            button; this reads as the annotation it is, while the brand colour
            still makes it the most noticeable thing on the card after the
            name — which it should be, since "you already follow them
            elsewhere" is the strongest reason to say yes. */}
        {props.blueskyNote && (
          <Group gap={5} wrap="nowrap">
            <FaBluesky
              fill={BLUESKY_BLUE}
              size={13}
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            />
            <Text fz={'xs'} fw={600} c={BLUESKY_BLUE} lineClamp={1}>
              {props.blueskyNote}
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
