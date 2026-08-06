'use client';

import { Box, Divider, Group, Image, Text } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { LinkButton } from '@/components/link/MantineLink';
import Stepper from '../stepper/Stepper';

interface Props {
  /**
   * Omitted on the returning view — there is no flow to show progress
   * through. One object rather than a currentStep/showStepper pair, so there
   * is no way to ask for a stepper without saying which stage, or to pass a
   * stage that nothing reads.
   */
  stepper?: {
    /** 1-based. */
    currentStep: number;
    /** Records the stage before the browser follows a stepper pill. */
    onSelectStep: (step: number) => void;
  };
  exitLabel: string;
  /** Writes the status before the browser follows the link. */
  onExit: () => void;
}

export default function OnboardingHeader(props: Props) {
  return (
    <Box
      component="header"
      // Frosted rather than transparent, now that artwork sits behind the
      // screen: the body scrolls under this bar, and without a background the
      // cards would read straight through it. Same treatment as the footer
      // pill, so the two ends of the screen match.
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        backgroundColor:
          'light-dark(rgba(255, 255, 255, 0.82), rgba(28, 25, 23, 0.82))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Group px={'md'} py={'sm'} gap={'md'} wrap="nowrap" align="center">
        {/* The bare mark, as in the navbar and the welcome screen — not the
            wordmark lockup. "Get started" sits right beside it, so a wordmark
            would put two pieces of text against each other. Sized by height so
            it keeps its aspect ratio and sits on the bar's rhythm. */}
        <Image
          src={SembleLogo.src}
          alt="Semble logo"
          h={28}
          w={'auto'}
          style={{ flex: '0 0 auto' }}
        />

        {/* Names the flow in the chrome. Deliberately a Text, not a Title:
            each stage already owns the page's h1 ("Pick a few topics"), and a
            second heading above it would compete with the real one.

            Hidden below `sm`, where the bar has only room for the logo, the
            numbered steps and the exit link. */}
        <Group
          gap={'sm'}
          wrap="nowrap"
          visibleFrom="sm"
          style={{ flex: '0 0 auto' }}
        >
          <Divider orientation="vertical" />
          <Text fw={600} c={'bright'}>
            Get started
          </Text>
        </Group>

        {props.stepper && (
          <Stepper
            currentStep={props.stepper.currentStep}
            onSelectStep={props.stepper.onSelectStep}
          />
        )}

        <LinkButton
          href="/home"
          variant="subtle"
          color="gray"
          size="compact-sm"
          ml={'auto'}
          onClick={props.onExit}
        >
          {props.exitLabel}
        </LinkButton>
      </Group>
    </Box>
  );
}
