'use client';

import { Box, Button, Container, Group } from '@mantine/core';
import { IoArrowBack, IoArrowForward } from 'react-icons/io5';
import { LinkButton } from '@/components/link/MantineLink';
import { CONTENT_SIZE } from '../onboardingScreen/OnboardingScreen';

interface Props {
  /** Href of the previous screen — the welcome screen on stage 1. */
  backHref?: string;
  /** Records the stage before the browser follows backHref, where there is one. */
  onBack?: () => void;
  onSkip?: () => void;
  onContinue?: () => void;
  /** Makes the forward control an anchor out of the flow. `onContinue` still
   * runs on the click, for whatever has to be recorded first. */
  continueHref?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
}

export default function OnboardingFooter(props: Props) {
  return (
    <Box
      component="footer"
      // Not `default-border`: this rule sits under a full page of content and
      // should read as the edge of the surface, not as a divider.
      style={{
        borderTop:
          '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      {/* The same Container size the stages render in, so Back and Continue
          land on the content's own left and right edges at every width. */}
      <Container size={CONTENT_SIZE} py={'sm'}>
        <Group justify="space-between" gap={'sm'} wrap="nowrap">
          {/* An anchor rather than router.back(), so it prefetches and
              middle-clicks. The empty span holds the row when there is nowhere
              to go back to. */}
          {props.backHref ? (
            <LinkButton
              href={props.backHref}
              variant="light"
              color="gray"
              radius={'xl'}
              leftSection={<IoArrowBack />}
              onClick={props.onBack}
            >
              Back
            </LinkButton>
          ) : (
            <span />
          )}

          <Group gap={'xs'} wrap="nowrap">
            {props.onSkip && (
              <Button
                variant="subtle"
                color="gray"
                radius={'xl'}
                onClick={props.onSkip}
              >
                Skip
              </Button>
            )}

            {/* An anchor when it leaves the flow, for the same reason Back is
                one. Within the flow the stage has work to do first — apply the
                picks, seed the next query — so those stay buttons. */}
            {props.continueHref ? (
              <LinkButton
                href={props.continueHref}
                radius={'xl'}
                rightSection={<IoArrowForward />}
                onClick={props.onContinue}
              >
                {props.continueLabel ?? 'Continue'}
              </LinkButton>
            ) : (
              props.onContinue && (
                <Button
                  radius={'xl'}
                  rightSection={<IoArrowForward />}
                  onClick={props.onContinue}
                  disabled={props.continueDisabled}
                >
                  {props.continueLabel ?? 'Continue'}
                </Button>
              )
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
