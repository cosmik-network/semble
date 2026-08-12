'use client';

import { useState } from 'react';
import {
  ActionIcon,
  BackgroundImage,
  Card,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IoMdClose } from 'react-icons/io';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';
import { LinkButton } from '@/components/link/MantineLink';
import {
  type OnboardingStatus,
  writeOnboardingStatus,
} from '../../lib/onboardingStatus';
import { useOnboardingProgress } from '../../lib/useOnboardingProgress';
import { resumePoint } from '../../lib/resumePoint';
import { TOTAL_STEPS } from '../../lib/steps';
import Stepper from '../stepper/Stepper';

const ARTWORK_MASK =
  'linear-gradient(to bottom, black 0%, black 35%, transparent 90%)';

// The `-webkit-` prefix is still needed for older Safari.
const ARTWORK_FADE = {
  maskImage: ARTWORK_MASK,
  WebkitMaskImage: ARTWORK_MASK,
};

// The stepper's own default is white, which disappears on this card's surface.
const REST_MARK_COLOR =
  'light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))';

interface Props {
  initialStatus: OnboardingStatus;
}

export default function HomeOnboardingBannerCard(props: Props) {
  const [status, setStatus] = useState<OnboardingStatus>(props.initialStatus);
  const { progress } = useOnboardingProgress();

  if (status !== 'unseen' && status !== 'in_progress') {
    return null;
  }

  const isResuming = status === 'in_progress';

  // useLocalStorage returns the hoisted EMPTY default until it has read
  // storage, so the first render falls back to stage 1 and the resume point
  // only ever improves — no null check needed.
  //
  // Gated on isResuming because the two stores can disagree: with the status
  // cookie absent but localStorage progress intact, this banner says "Set up
  // your account" and would otherwise drop the user mid-flow.
  const resume = resumePoint(isResuming, progress.stepId);

  const dismiss = () => {
    writeOnboardingStatus('dismissed');
    setStatus('dismissed');
  };

  return (
    <Card withBorder radius={'lg'} p={{ base: 'md', sm: 'lg' }} pos="relative">
      <BackgroundImage
        src={BG.src}
        darkHidden
        pos="absolute"
        inset={0}
        style={ARTWORK_FADE}
      />
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        pos="absolute"
        inset={0}
        style={ARTWORK_FADE}
      />

      <Group
        justify="space-between"
        align="flex-end"
        wrap="wrap"
        gap={'md'}
        pos="relative"
      >
        <Stack gap={4} miw={0}>
          <Text fw={700} fz={'lg'} c={'bright'}>
            {isResuming ? 'Resume setup' : 'Set up your account'}
          </Text>

          <Text fz={'sm'} fw={600} c={'gray'}>
            {isResuming
              ? `Step ${resume.step} of ${TOTAL_STEPS} · ${resume.label}`
              : 'Five quick steps to get started'}
          </Text>

          <Stepper currentStep={resume.step} restColor={REST_MARK_COLOR} />
        </Stack>

        <LinkButton href={resume.href} w={{ base: '100%', sm: 'auto' }}>
          {isResuming ? 'Continue' : 'Get started'}
        </LinkButton>
      </Group>

      <ActionIcon
        variant="subtle"
        color="gray"
        radius={'xl'}
        aria-label="Dismiss setup banner"
        onClick={dismiss}
        pos="absolute"
        top={8}
        right={8}
      >
        <IoMdClose size={18} />
      </ActionIcon>
    </Card>
  );
}
