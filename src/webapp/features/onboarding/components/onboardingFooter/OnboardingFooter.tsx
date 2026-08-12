'use client';

import { Box, Button, Container, Group } from '@mantine/core';
import { IoArrowBack, IoArrowForward } from 'react-icons/io5';
import { LinkButton } from '@/components/link/MantineLink';
import { CONTENT_SIZE } from '../onboardingScreen/OnboardingScreen';

interface Props {
  backHref?: string;
  onBack?: () => void;
  onSkip?: () => void;
  onContinue?: () => void;
  continueHref?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
}

export default function OnboardingFooter(props: Props) {
  return (
    <Box
      component="footer"
      style={{
        borderTop:
          '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Container size={CONTENT_SIZE} py={'sm'}>
        <Group justify="space-between" gap={'sm'} wrap="nowrap">
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
