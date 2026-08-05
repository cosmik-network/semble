'use client';

import { Box, Group, Progress, Stack, Text } from '@mantine/core';
import { STEPS, TOTAL_STEPS } from '../../lib/steps';

interface Props {
  /** 1-based. */
  currentStep: number;
}

export default function Stepper(props: Props) {
  const current = STEPS[props.currentStep - 1];

  return (
    <Box flex={1} miw={0}>
      {/* Desktop: every stage named. */}
      <Group gap={'xs'} wrap="nowrap" visibleFrom="sm">
        {STEPS.map((step, index) => {
          const position = index + 1;
          const isCurrent = position === props.currentStep;
          const isDone = position < props.currentStep;

          return (
            <Group gap={'xs'} wrap="nowrap" key={step.id}>
              {index > 0 && <Box w={18} h={1} bg={'gray.4'} />}
              <Group gap={6} wrap="nowrap">
                <Text
                  component="span"
                  fz={10}
                  fw={700}
                  w={18}
                  h={18}
                  ta={'center'}
                  style={{
                    lineHeight: '18px',
                    borderRadius: 999,
                    background: isCurrent
                      ? 'var(--mantine-color-tangerine-6)'
                      : isDone
                        ? 'var(--mantine-color-green-6)'
                        : 'transparent',
                    color:
                      isCurrent || isDone
                        ? 'var(--mantine-color-white)'
                        : 'inherit',
                    border:
                      isCurrent || isDone
                        ? 'none'
                        : '1px solid var(--mantine-color-gray-5)',
                  }}
                >
                  {isDone ? '✓' : position}
                </Text>
                <Text
                  fz={'sm'}
                  fw={isCurrent ? 700 : 500}
                  c={isCurrent ? 'bright' : 'dimmed'}
                >
                  {step.label}
                </Text>
              </Group>
            </Group>
          );
        })}
      </Group>

      {/* Mobile: segments plus the current stage's name. */}
      <Stack gap={4} hiddenFrom="sm">
        <Group gap={4} wrap="nowrap">
          {STEPS.map((step, index) => (
            <Progress
              key={step.id}
              flex={1}
              size={3}
              radius={'xl'}
              value={index + 1 <= props.currentStep ? 100 : 0}
              color={index + 1 < props.currentStep ? 'green' : 'tangerine'}
            />
          ))}
        </Group>
        <Text fz={'xs'} fw={700}>
          Step {props.currentStep} of {TOTAL_STEPS} · {current.label}
        </Text>
      </Stack>
    </Box>
  );
}
