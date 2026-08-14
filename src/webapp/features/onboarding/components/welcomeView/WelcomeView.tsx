'use client';

import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Center,
  Group,
  Image,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import {
  IoAlbums,
  IoCompass,
  IoHelpCircle,
  IoPeople,
  IoPricetag,
} from 'react-icons/io5';
import SembleLogo from '@/assets/semble-logo-full.svg';
import { LinkAnchor, LinkButton } from '@/components/link/MantineLink';
import useMyProfileStats from '@/features/profile/lib/queries/useMyProfileStats';
import { sanitizeText } from '@/lib/utils/text';
import OnboardingBackground from '../onboardingBackground/OnboardingBackground';

// Exported for the skeleton, which renders them for real: they are constants,
// so greying them out would only add a shift when the profile lands.
export const STAGES: { icon: ReactNode; title: string }[] = [
  { icon: <IoHelpCircle />, title: 'Answer two quick questions' },
  { icon: <IoPricetag />, title: 'Pick a few topics' },
  { icon: <IoAlbums />, title: 'Find interesting content' },
  { icon: <IoPeople />, title: 'Connect with others' },
  { icon: <IoCompass />, title: 'Explore the rest of the app' },
];

const DOCS_URL = 'https://docs.cosmik.network/semble';
const DISCORD_URL = 'https://discord.gg/SHvvysb73e';
// TODO: replace with the real Tally form ID once the form is created
const FEEDBACK_URL = 'https://tally.so/r/GxEjkz';

const HELP_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer',
  fz: 'sm',
  fw: 600,
  underline: 'never',
  c: 'blue',
} as const;

interface Props {
  onStart: () => void;
}

export default function WelcomeView(props: Props) {
  // useMyProfileStats, not useMyProfile: the latter is a suspense query on a
  // key this route does not prefetch, so it would drop the whole screen behind
  // the route fallback.
  const { data: profile } = useMyProfileStats();

  const firstName = profile?.name
    ? sanitizeText(profile.name).trim().split(/\s+/)[0]
    : undefined;

  return (
    <Box component="main" pos="relative" h={'100svh'} w={'100%'}>
      <OnboardingBackground variant="welcome" />

      <Box pos={'absolute'} top={0} left={0} p={'md'} style={{ zIndex: 2 }}>
        <Image src={SembleLogo.src} alt="Semble logo" h={28} w={'auto'} />
      </Box>

      <Center
        pos="relative"
        h={'100%'}
        p={'md'}
        style={{ zIndex: 1, overflowY: 'auto' }}
      >
        <Stack
          gap={'xl'}
          align="flex-start"
          w={'fit-content'}
          maw={400}
          py={'xl'}
        >
          <Group gap={'sm'} w={'100%'}>
            <Avatar
              src={profile?.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
              alt={`${profile?.name || profile?.handle}'s avatar`}
              size={'lg'}
              radius={'md'}
            />

            <Title order={1} fz={'h2'}>
              {firstName ? `Welcome, ${firstName}` : 'Welcome'}
            </Title>
          </Group>

          <Stack gap={'sm'} w={'100%'}>
            {STAGES.map((stage) => (
              <Group key={stage.title} gap={'sm'} wrap="nowrap" align="center">
                <ThemeIcon
                  variant="light"
                  color="gray"
                  size={'lg'}
                  radius={'xl'}
                >
                  {stage.icon}
                </ThemeIcon>

                <Text fw={600} c={'bright'}>
                  {stage.title}
                </Text>
              </Group>
            ))}
          </Stack>

          <Stack gap={'md'}>
            <Group gap={'xs'} wrap="nowrap">
              <LinkButton
                href="/onboarding?step=1"
                size="md"
                rightSection={<BiRightArrowAlt size={18} />}
                onClick={props.onStart}
              >
                Get started
              </LinkButton>

              <LinkButton href="/home" size="md" variant="light" color="gray">
                Not now
              </LinkButton>
            </Group>

            <Text fz={'sm'} c={'gray'} fw={500} maw={280}>
              Questions?{' '}
              <LinkAnchor href={DOCS_URL} {...HELP_LINK_PROPS}>
                Read the docs
              </LinkAnchor>
              ,{' '}
              <LinkAnchor href={DISCORD_URL} {...HELP_LINK_PROPS}>
                join the Discord
              </LinkAnchor>
              , or{' '}
              <LinkAnchor href={FEEDBACK_URL} {...HELP_LINK_PROPS}>
                give feedback
              </LinkAnchor>
              .
            </Text>
          </Stack>
        </Stack>
      </Center>
    </Box>
  );
}
