'use client';

import { ActionIcon, Box, Button, Group, Stack, Text } from '@mantine/core';
import type { IconType } from 'react-icons/lib';
import { FaRegNoteSticky } from 'react-icons/fa6';
import {
  MdOutlineExplore,
  MdOutlinePeopleAlt,
  MdOutlineTag,
} from 'react-icons/md';
import { LinkActionIcon, LinkButton } from '@/components/link/MantineLink';
import { STEPS, TOTAL_STEPS, type StepId } from '../../lib/steps';

interface Props {
  /** 1-based. */
  currentStep: number;
  /** Records the stage before the browser follows the pill's href. */
  onSelectStep: (step: number) => void;
}

/**
 * Kept here rather than on STEPS so the step registry stays free of React and
 * react-icons. A Record keyed by StepId rather than a lookup with a fallback:
 * adding a step id is a type error until it has an icon.
 *
 * Cards and people reuse the icons the rest of the app already uses for those
 * things — FaRegNoteSticky and MdOutlinePeopleAlt are the search tabs, the
 * home rails and the composer.
 */
const STEP_ICONS: Record<StepId, IconType> = {
  topics: MdOutlineTag,
  cards: FaRegNoteSticky,
  follow: MdOutlinePeopleAlt,
  next: MdOutlineExplore,
};

type StepState = 'done' | 'current' | 'upcoming';

function stepState(position: number, currentStep: number): StepState {
  if (position < currentStep) return 'done';
  if (position === currentStep) return 'current';
  return 'upcoming';
}

/** Light for where you are, subtle for everything else. */
function variant(state: StepState) {
  return state === 'current' ? 'light' : 'subtle';
}

/**
 * Colour carries the done/upcoming split that the variant alone cannot: both
 * render subtle, and without this a finished stage looks identical to one you
 * have not reached. The current stage needs no colour of its own — the light
 * variant is already the only filled pill in the row.
 */
function color(state: StepState): string {
  return state === 'done' ? 'green' : 'gray';
}

export default function Stepper(props: Props) {
  const current = STEPS[props.currentStep - 1];

  return (
    <Box component="nav" aria-label="Setup progress" flex={1} miw={0}>
      {/* Desktop: icon and label per stage. */}
      <Group gap={4} wrap="nowrap" visibleFrom="sm">
        {STEPS.map((step, index) => {
          const position = index + 1;
          const state = stepState(position, props.currentStep);
          const Icon = STEP_ICONS[step.id];

          // Every stage but the one you are on is a link, forward as well as
          // back. Real anchors rather than router.push in a handler: there is
          // no async work to do first, and they prefetch and middle-click.
          // onSelectStep runs before the browser follows, so the stored
          // stepId tracks the jump and the home banner resumes where you
          // actually went.
          //
          // The current stage is component="div", not a disabled button: it is
          // not unavailable, it is where you are, and a link to the page you
          // are already on is noise in the tab order.
          //
          // Jumping ahead can land on an empty state — stage 2 with no topics
          // has nothing to recommend. Both of those stages say so and point
          // back, so the cost is a wasted click rather than a dead end.
          return state === 'current' ? (
            <Button
              key={step.id}
              component="div"
              aria-current="step"
              variant={variant(state)}
              color={color(state)}
              size="compact-sm"
              radius={'xl'}
              leftSection={<Icon size={16} />}
            >
              {step.label}
            </Button>
          ) : (
            <LinkButton
              key={step.id}
              href={`/onboarding?step=${position}`}
              onClick={() => props.onSelectStep(position)}
              variant={variant(state)}
              color={color(state)}
              size="compact-sm"
              radius={'xl'}
              leftSection={<Icon size={16} />}
            >
              {step.label}
            </LinkButton>
          );
        })}
      </Group>

      {/* Mobile: the same states as icons only — four labels do not fit — with
          the current stage named once underneath. ActionIcon rather than a
          Button with no children so the padding stays square. */}
      <Stack gap={4} hiddenFrom="sm">
        <Group gap={4} wrap="nowrap">
          {STEPS.map((step, index) => {
            const position = index + 1;
            const state = stepState(position, props.currentStep);
            const Icon = STEP_ICONS[step.id];

            // No aria-label on the current pill: an aria-label on a plain div
            // has no role to attach to and most screen readers drop it. The
            // "Step N of 4 · <label>" line below is the accessible statement
            // of where you are, which is why it exists at this width.
            return state === 'current' ? (
              <ActionIcon
                key={step.id}
                component="div"
                variant={variant(state)}
                color={color(state)}
                radius={'xl'}
              >
                <Icon size={16} />
              </ActionIcon>
            ) : (
              <LinkActionIcon
                key={step.id}
                href={`/onboarding?step=${position}`}
                onClick={() => props.onSelectStep(position)}
                aria-label={`Go to ${step.label}`}
                variant={variant(state)}
                color={color(state)}
                radius={'xl'}
              >
                <Icon size={16} />
              </LinkActionIcon>
            );
          })}
        </Group>

        <Text fz={'xs'} fw={700}>
          Step {props.currentStep} of {TOTAL_STEPS} · {current.label}
        </Text>
      </Stack>
    </Box>
  );
}
