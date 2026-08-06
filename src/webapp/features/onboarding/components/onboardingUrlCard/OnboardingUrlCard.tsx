'use client';

import type { UrlView } from '@/api-client';
import { Box, Card, Center, Group, Image, Stack, Text } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { TOPIC_COLOR } from '../topicTile/topicVisuals';
import tileStyles from '../topicTile/TopicTile.module.css';

/**
 * A fixed square at every card height — small enough to leave the text room in
 * a two-column grid at 360px.
 */
const THUMBNAIL = 44;

interface Props {
  urlView: UrlView;
  selected: boolean;
  onToggle: (url: string) => void;
}

export default function OnboardingUrlCard(props: Props) {
  const metadata = props.urlView.metadata;

  return (
    // The whole card is the toggle, exactly like a topic tile — same
    // aria-pressed, same border cue, same hover stylesheet. That makes the two
    // picking stages one interaction, and it deletes the checkbox along with
    // the click-bubbling workaround it needed to avoid firing twice.
    <Card
      component="button"
      type="button"
      aria-pressed={props.selected}
      onClick={() => props.onToggle(props.urlView.url)}
      withBorder
      radius={'lg'}
      padding={'sm'}
      h={'100%'}
      ta="left"
      className={tileStyles.tile}
      style={{
        // No fill when selected. Mantine's `-light` shades are translucent, so
        // over the page artwork the tint washed out and read as a rendering
        // fault rather than a state. The accent lives entirely on the edge.
        //
        // A box-shadow ring rather than a wider border: shadows take no layout
        // space, so the card cannot change size — and a grid of five that
        // resizes on click is the reflow this stage keeps avoiding.
        borderColor: props.selected
          ? `var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
        boxShadow: props.selected
          ? `0 0 0 1px var(--mantine-color-${TOPIC_COLOR}-filled)`
          : undefined,
        // The whole card is the toggle, so dragging across it should never
        // start a selection. Mantine has no prop for this.
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Thumbnail left, text right — a compact row rather than a hero image.
          Five of these read at a glance where five big images have to be
          scrolled, and it keeps the cards short enough to sit two or three
          across.

          A fixed square, centred against the text — never stretched to the
          card's height. Cards in a grid row are all as tall as the tallest, so
          a rail that filled that height changed size card to card and cropped
          each preview differently. */}
      <Group gap={'xs'} wrap="nowrap" align="center">
        <Box
          w={THUMBNAIL}
          h={THUMBNAIL}
          style={{
            // Without this the thumbnail is a flex item a long title can
            // squeeze, so the text's left edge would jitter card to card.
            flexShrink: 0,
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px solid var(--mantine-color-default-border)',
            overflow: 'hidden',
          }}
        >
          {metadata.imageUrl ? (
            // Both dimensions, not just one: with the other left auto the img
            // is constrained on a single axis and object-fit has no box to
            // crop against, so a wide preview renders squashed. 100%/100% +
            // cover fills the square and crops the overflow instead.
            <Image
              src={metadata.imageUrl}
              alt=""
              w={'100%'}
              h={'100%'}
              fit="cover"
            />
          ) : (
            // Always filled rather than omitted: in a grid, cards whose text
            // starts at a different offset read as misaligned, where in a list
            // they simply looked ragged.
            <Center h={'100%'} bg={'var(--mantine-color-default-hover)'}>
              <FaRegNoteSticky size={16} color="var(--mantine-color-dimmed)" />
            </Center>
          )}
        </Box>

        <Stack gap={2} miw={0}>
          {/* `||`, not `??`: title: '' would otherwise render an empty heading
              instead of falling back to the URL. A span, not Text's default
              <p> — this sits inside a <button>. */}
          <Text
            component="span"
            fw={600}
            c={'bright'}
            fz={'sm'}
            lh={1.3}
            lineClamp={2}
          >
            {metadata.title || props.urlView.url}
          </Text>

          {metadata.description && (
            <Text component="span" fz={'xs'} c={'dimmed'} lineClamp={2}>
              {metadata.description}
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
  );
}
