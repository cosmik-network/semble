'use client';

import {
  Avatar,
  BackgroundImage,
  Box,
  Center,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { MdOutlinePeopleAlt, MdOutlineTag } from 'react-icons/md';
import type { IconType } from 'react-icons/lib';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';
import SembleLogo from '@/assets/semble-logo-full.svg';
import { LinkAnchor, LinkButton } from '@/components/link/MantineLink';
import useMyProfileStats from '@/features/profile/lib/queries/useMyProfileStats';
import { sanitizeText } from '@/lib/utils/text';

/**
 * What the flow will ask for, in the user's terms rather than the stepper's.
 * Deliberately not derived from STEPS: those labels name tabs ("Topics"), and
 * this list has to read as a promise ("Pick a few topics"). Three, not four —
 * stage 4 is the payoff, not a task.
 */
const STAGES: { icon: IconType; title: string; description: string }[] = [
  {
    icon: MdOutlineTag,
    title: 'Pick a few topics',
    description: 'So we know what to look for.',
  },
  {
    icon: FaRegNoteSticky,
    title: 'Say what interests you',
    description: 'A few cards is enough to go on.',
  },
  {
    icon: MdOutlinePeopleAlt,
    title: 'Find people to follow',
    description: 'Curators and collections worth watching.',
  },
];

interface Props {
  /** Records that the flow has been entered, before the browser follows. */
  onStart: () => void;
}

export default function WelcomeView(props: Props) {
  // useMyProfileStats, not useMyProfile: the latter is a suspense query on a
  // key this route does not prefetch, so it would drop the whole screen behind
  // loading.tsx. This one reads the key page.tsx already hydrates, so the name
  // and avatar are there on the first render — no pop-in, no greeting that
  // changes under the reader.
  const { data: profile } = useMyProfileStats();

  // Just the first word: "Welcome, Alice Smith" reads like a form letter.
  const firstName = profile?.name
    ? sanitizeText(profile.name).trim().split(/\s+/)[0]
    : undefined;

  return (
    <Box component="main" pos="relative" h={'100svh'} w={'100%'}>
      {/* Same artwork as the landing page, so arriving here from it feels like
          the same place. Two elements rather than one swapped src: a hidden
          element's background is never fetched, so the inactive scheme costs
          nothing. */}
      <BackgroundImage src={BG.src} darkHidden pos={'absolute'} h={'100%'} />
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        pos={'absolute'}
        h={'100%'}
      />

      <Center
        pos="relative"
        h={'100%'}
        p={'md'}
        style={{ zIndex: 1, overflowY: 'auto' }}
      >
        <Stack gap={'lg'} align="center" w={'100%'} maw={440}>
          {/* Above the card, not inside it — the same place the auth layouts
              put it. Stacked directly over the avatar it read as two competing
              images; out here it is unambiguously the brand and the avatar is
              unambiguously the hero.

              The full mark-and-wordmark lockup, unlike the header's bare mark:
              this is the first screen of the app and the only thing naming it,
              now that the greeting reads just "Welcome". Sized by height so it
              keeps its aspect ratio. */}
          <Image src={SembleLogo.src} alt="Semble logo" h={28} w={'auto'} />

          {/* Solid, not frosted: the card is the thing being read, and the
              artwork behind it is the frame. Paper's default background is
              var(--mantine-color-body) — white in light mode, the dark surface
              in dark — so this needs no custom colour at all. */}
          <Paper
            radius={'lg'}
            p={{ base: 'lg', xs: 'xl' }}
            w={'100%'}
            shadow="md"
            withBorder
          >
            <Stack gap={'xl'} align="center">
              <Stack gap={'xs'} align="center">
                {/* The user is the hero of this screen, so their face is the
                  large image. Thumbnail variant, as everywhere else that
                  renders an avatar at this size. Decorative — the greeting
                  below already names them.

                  50%, not radius="xl": the theme sets Avatar's default radius
                  to md, and xl is still a rounded square at this size. */}
                <Avatar
                  src={profile?.avatarUrl?.replace(
                    'avatar',
                    'avatar_thumbnail',
                  )}
                  alt=""
                  size={72}
                  radius={'50%'}
                />

                {/* No subtitle: the three stages listed below already say what
                  the flow does, and any line here only restated them.

                  Bare "Welcome" without a name — not "Welcome to Semble". The
                  brand mark sits right above the card, so naming it again here
                  is a stutter. */}
                <Title order={1} fz={'1.75rem'} ta={'center'}>
                  {firstName ? `Welcome, ${firstName}` : 'Welcome'}
                </Title>
              </Stack>

              <Stack gap={'md'} w={'100%'}>
                {STAGES.map((stage) => (
                  <Group key={stage.title} gap={'sm'} wrap="nowrap">
                    <ThemeIcon
                      variant="light"
                      color="gray"
                      size={'lg'}
                      radius={'xl'}
                    >
                      <stage.icon size={18} />
                    </ThemeIcon>

                    <Stack gap={0} miw={0}>
                      <Text fw={600} c={'bright'} fz={'sm'}>
                        {stage.title}
                      </Text>
                      <Text c={'dimmed'} fz={'sm'}>
                        {stage.description}
                      </Text>
                    </Stack>
                  </Group>
                ))}
              </Stack>

              <Stack gap={'xs'} align="center" w={'100%'}>
                {/* A real anchor to stage 1 — nothing to do first, so it
                  prefetches and middle-clicks. onStart only records that the
                  flow has begun. */}
                <LinkButton
                  href="/onboarding?step=1"
                  size="md"
                  w={'100%'}
                  rightSection={<BiRightArrowAlt size={18} />}
                  onClick={props.onStart}
                >
                  Get started
                </LinkButton>

                {/* Deliberately does not dismiss: "Not now" means later, so the
                  home banner has to still be there to come back to. Dismissing
                  is what the banner's own close button is for. */}
                <LinkAnchor href="/home" fz={'sm'} c={'dimmed'}>
                  Not now
                </LinkAnchor>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Center>
    </Box>
  );
}
