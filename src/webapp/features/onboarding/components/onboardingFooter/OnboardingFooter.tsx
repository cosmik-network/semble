'use client';

import { Button, Group } from '@mantine/core';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  /** Href of the previous stage. Omitted on stage 1. */
  backHref?: string;
  onSkip?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
}

export default function OnboardingFooter(props: Props) {
  return (
    <Group
      component="footer"
      px={'md'}
      py={'sm'}
      justify="space-between"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      {props.backHref ? (
        <LinkButton href={props.backHref} variant="subtle" color="gray">
          Back
        </LinkButton>
      ) : (
        <span />
      )}

      <Group gap={'xs'}>
        {props.onSkip && (
          <Button variant="subtle" color="gray" onClick={props.onSkip}>
            Skip this step
          </Button>
        )}
        {props.onContinue && (
          <Button
            color="dark"
            onClick={props.onContinue}
            disabled={props.continueDisabled}
            loading={props.continueLoading}
          >
            {props.continueLabel ?? 'Continue'}
          </Button>
        )}
      </Group>
    </Group>
  );
}
