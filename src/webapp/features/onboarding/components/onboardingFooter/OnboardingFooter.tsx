'use client';

import { Button, Group } from '@mantine/core';
import { IoArrowBack } from 'react-icons/io5';
import { LinkActionIcon } from '@/components/link/MantineLink';

interface Props {
  /** Href of the previous stage. Omitted on stage 1. */
  backHref?: string;
  /** Records the stage before the browser follows backHref. */
  onBack?: () => void;
  onSkip?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}

export default function OnboardingFooter(props: Props) {
  return (
    // A pill floating clear of the bottom edge rather than a full-width bar.
    // Sized by its contents and centred, so it reads as a small set of
    // controls travelling with you rather than page chrome — which is why
    // there is no longer a spacer where Back is absent, and no space-between
    // stretching two buttons apart.
    //
    // Absolute against OnboardingScreen's relative shell, not fixed: it should
    // belong to this screen, not to the viewport.
    <Group
      component="footer"
      pos="absolute"
      // Keep in step with OnboardingScreen's bottom padding, which reserves
      // room for this pill plus this gap.
      bottom={12}
      left={'50%'}
      px={'xs'}
      py={'xs'}
      gap={'xs'}
      wrap="nowrap"
      style={{
        transform: 'translateX(-50%)',
        zIndex: 2,
        borderRadius: 'var(--mantine-radius-xl)',
        border: '1px solid var(--mantine-color-default-border)',
        // Translucent and blurred, so content scrolling underneath reads as
        // passing behind it rather than being cut off.
        backgroundColor:
          'light-dark(rgba(255, 255, 255, 0.82), rgba(28, 25, 23, 0.82))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--mantine-shadow-md)',
      }}
    >
      {props.backHref && (
        // The app's back affordance — same IoArrowBack, size and shape as
        // components/navigation/backButton. Still an anchor to the previous
        // stage rather than router.back(), so it prefetches and middle-clicks;
        // and icon-only, so it needs the label spelled out for screen readers.
        <LinkActionIcon
          href={props.backHref}
          aria-label="Go back"
          variant="light"
          color="gray"
          size="lg"
          radius={'xl'}
          onClick={props.onBack}
        >
          <IoArrowBack />
        </LinkActionIcon>
      )}

      {props.onSkip && (
        <Button
          variant="light"
          color="gray"
          radius={'xl'}
          onClick={props.onSkip}
        >
          Skip
        </Button>
      )}

      {props.onContinue && (
        <Button
          color="dark"
          radius={'xl'}
          onClick={props.onContinue}
          disabled={props.continueDisabled}
        >
          {props.continueLabel ?? 'Continue'}
        </Button>
      )}
    </Group>
  );
}
