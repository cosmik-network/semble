import { Box, Group, Image, Text } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import StepperSkeleton from '../stepper/Skeleton.Stepper';

interface Props {
  /** The returning view has no stepper. */
  withStepper?: boolean;
}

export default function OnboardingHeaderSkeleton(props: Props) {
  return (
    <Box component="header">
      <Group
        p={'md'}
        gap={'md'}
        wrap="nowrap"
        align="center"
        justify="space-between"
      >
        <Group gap={'xs'} wrap="nowrap">
          <Image src={SembleLogo.src} alt="Semble logo" h={28} w={'auto'} />
          <Text fw={600}>Get started</Text>
        </Group>

        {props.withStepper && <StepperSkeleton />}
      </Group>
    </Box>
  );
}
