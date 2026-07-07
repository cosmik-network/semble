import {
  SimpleGrid,
  Image,
  Text,
  BackgroundImage,
  Title,
  Stack,
  Container,
  Box,
  Center,
  Group,
  Badge,
  Button,
  Avatar,
  Card,
  Anchor,
} from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import CtaSignup from '@/assets/cta-signup.png';
import CurateIcon from '@/assets/icons/curate-icon.svg';
import McpIcon from '@/assets/icons/mcp-icon.svg';
import ChatgptIcon from '@/assets/icons/chatgpt-icon.svg';
import ClaudeIcon from '@/assets/icons/claude-icon.svg';
import ZoteroIcon from '@/assets/icons/zotero-icon.svg';
import ObsidianIcon from '@/assets/icons/obsidian-icon.svg';
import BlueskyIcon from '@/assets/icons/bluesky-icon.svg';
import AirglowIcon from '@/assets/icons/airglow-icon.svg';
import ChromeIcon from '@/assets/icons/chrome-icon.svg';
import FirefoxIcon from '@/assets/icons/firefox-icon.svg';
import SafariIcon from '@/assets/icons/safari-icon.svg';
import SembleLogo from '@/assets/semble-logo.svg';
import Footer from '@/components/landing/footer/Footer';
import FAQ from '@/components/landing/faq/FAQ';
import { Fragment, Suspense } from 'react';
import AuthButtons from '@/components/landing/authButtons/AuthButtons';
import { IoArrowForward } from 'react-icons/io5';
import EmailSubscribe from '@/components/landing/emailSubscribe/EmailSubscribe';
import { LinkButton } from '@/components/link/MantineLink';
import { BiRightArrowAlt } from 'react-icons/bi';
import { IoMdCode, IoMdColorWand } from 'react-icons/io';
import { PiPlugsConnectedFill, PiPuzzlePieceBold } from 'react-icons/pi';
import { getBlueskyProfile } from '@/features/platforms/bluesky/lib/dal';

const testimonials = [
  {
    name: 'Mark',
    handle: 'uppy-hacker.bsky.social',
    quote:
      'Becoming risky taking a *quick* look @semble.so of a morning...so many inviting rabbit holes to get drawn down!',
  },
  {
    name: 'Brady Hawkins',
    handle: 'bradyhawkins.dev',
    quote:
      "The articles that people are bookmarking on @semble.so are high quality. It's quickly becoming my go to place to consume dev content",
  },
  {
    name: 'Victoria',
    handle: 'vicwalker.dev.br',
    quote:
      "“I love seeing notifications about a new connection being added to a card on Semble. Sometimes I discover some cool stuff I haven't seen before.”",
  },
  {
    name: 'Thoth',
    handle: 'thoth.ptnote.dev',
    quote: 'Memex 2 is happening.',
  },
];

export default async function Page() {
  const profiles = await Promise.all(
    testimonials.map((t) => getBlueskyProfile(t.handle)),
  );
  const testimonialsWithAvatars = testimonials.map((t, i) => ({
    ...t,
    avatar: profiles[i]?.avatar ?? null,
  }));

  return (
    <Box component="section" pos="relative" h="100svh" w="100%">
      {/* light mode bg */}
      <BackgroundImage src={BG.src} darkHidden h="100svh" pos={'absolute'} />

      {/* dark mode bg */}
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        h="100svh"
        pos={'absolute'}
      />

      <Box pos="relative" style={{ zIndex: 1 }}>
        <Content testimonials={testimonialsWithAvatars} />
      </Box>
    </Box>
  );
}

function Content(props: {
  testimonials: {
    name: string;
    handle: string;
    quote: string;
    avatar: string | null;
  }[];
}) {
  return (
    <Fragment>
      <script async src="https://tally.so/widgets/embed.js" />
      <Container size="xl" p="sm" my="auto">
        <Group justify="space-between">
          <Stack gap={6} align="center">
            <Image src={SembleLogo.src} alt="Semble logo" w={25} h="auto" />
            <Badge size="xs">Alpha</Badge>
          </Stack>
          <EmailSubscribe />
        </Group>
      </Container>

      <Center mih="100svh" py={{ base: '2rem', xs: '5rem' }}>
        <Container size="xl" p="sm" my="auto">
          <Stack gap="5rem" align="center">
            <Stack gap="xs" align="center" maw={700}>
              <LinkButton
                href={'https://atmosphereconf.org/event/OD6Gd0A'}
                size="compact-sm"
                leftSection={'🪿'}
                variant="default"
                rightSection={<IoArrowForward />}
                c="#4098FF"
                bg={'blue.0'}
              >
                Watch our talk at ATmosphereConf!
              </LinkButton>
              <Title order={1} fw={700} fz="2.4rem" ta={'center'}>
                Save what matters <br /> Make sense of it together
              </Title>

              {/* light mode subtitle */}
              <Text
                fw={600}
                fz={'xl'}
                c="#1F6144"
                ta={'center'}
                maw={340}
                darkHidden
              >
                Semble is a collaborative space for mapping the web, connecting
                ideas, and building shared knowledge
              </Text>

              {/* dark mode subtitle */}
              <Text
                fw={600}
                fz="xl"
                c="#1e4dd9"
                ta={'center'}
                maw={340}
                lightHidden
              >
                Semble is a collaborative space for mapping the web, connecting
                ideas, and building shared knowledge
              </Text>

              <AuthButtons />
            </Stack>

            <Stack gap={'8rem'}>
              <Stack align="center" gap={'xs'}>
                <Title order={2} ta={'center'} maw={380}>
                  Turn bookmarks into knowledge trails
                </Title>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Save links, connect related ideas, and curate collections on
                  your own or collaboratively.
                </Text>
              </Stack>

              <Stack align="center" gap={'xs'}>
                <Title order={2} ta={'center'} maw={400}>
                  Find your way through the web with the people you trust.
                </Title>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Save links, connect related ideas, and curate collections on
                  your own or collaboratively.
                </Text>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Tune your notifications to the interactions that matter to
                  you. Explore a living map of the web that you helped create.
                </Text>
              </Stack>

              <Stack align="center" gap={'xs'}>
                <Title order={2} ta={'center'} maw={400}>
                  Your workflow, your way.
                </Title>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Integrate Semble into your existing knowledge workflows or
                  create something entirely new.
                </Text>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Use community-built plugins and automations, or tap the API to
                  build your own — all on top of a living network.
                </Text>

                <SimpleGrid
                  cols={{ base: 1, xs: 2, sm: 2, md: 2, lg: 4 }}
                  spacing={{ base: 'xs' }}
                  mt={{ base: '1rem' }}
                >
                  <Card bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))">
                    <Stack justify="space-between" h="100%">
                      <IoMdCode
                        size={28}
                        color="var(--mantine-color-green-6)"
                      />

                      <Stack gap="xs">
                        <Text fw={600} fz="lg">
                          API
                        </Text>
                        <Text c="dimmed">
                          Integrate Semble with your own workflow. Ask your
                          library questions with AI. Use it however you
                          want{' '}
                        </Text>

                        <Group gap={'xs'}>
                          <Image
                            src={McpIcon.src}
                            alt="MCP"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                          <Image
                            src={ChatgptIcon.src}
                            alt="ChatGPT"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                          <Image
                            src={ClaudeIcon.src}
                            alt="Claude"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>

                  <Card bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))">
                    <Stack justify="space-between" h="100%">
                      <PiPlugsConnectedFill
                        size={28}
                        color="var(--mantine-color-green-6)"
                      />

                      <Stack gap="xs">
                        <Text fw={600} fz="lg">
                          Plugin
                        </Text>
                        <Text c="dimmed">
                          Sync your links and notes to your Zotero or Obsidian
                          vault, and keep curating without ever switching tabs
                        </Text>

                        <Group gap={'xs'}>
                          <Image
                            src={ZoteroIcon.src}
                            alt="Zotero"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                          <Image
                            src={ObsidianIcon.src}
                            alt="Obsidian"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>

                  <Card bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))">
                    <Stack justify="space-between" h="100%">
                      <IoMdColorWand
                        size={28}
                        color="var(--mantine-color-green-6)"
                      />

                      <Stack gap="xs">
                        <Text fw={600} fz="lg">
                          Automation
                        </Text>
                        <Text c="dimmed">
                          Use Airglow to automate the busywork. Sync your
                          Bluesky follows, or save links from posts you've liked
                        </Text>

                        <Group gap={'xs'}>
                          <Image
                            src={AirglowIcon.src}
                            alt="Airglow"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                          <Image
                            src={BlueskyIcon.src}
                            alt="Bluesky"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>

                  <Card bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))">
                    <Stack justify="space-between" h="100%">
                      <PiPuzzlePieceBold
                        size={28}
                        color="var(--mantine-color-green-6)"
                      />

                      <Stack gap="xs">
                        <Text fw={600} fz="lg">
                          Web extension
                        </Text>
                        <Text c="dimmed">
                          Save from anywhere. Organize your links. Find related
                          content. Discover new connections
                        </Text>

                        <Group gap={'xs'}>
                          <Image
                            src={ChromeIcon.src}
                            alt="Chrome"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                          <Image
                            src={FirefoxIcon.src}
                            alt="Firefox"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                          <Image
                            src={SafariIcon.src}
                            alt="Safari"
                            w={22}
                            h={22}
                            fit="contain"
                          />
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>
                </SimpleGrid>
              </Stack>

              <Stack align="center" gap={'xs'}>
                <Title order={2} ta={'center'} maw={400}>
                  What you make here stays yours
                </Title>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Semble is built on the open social web, so your content,
                  identity, and social connections are owned by you, not us.
                </Text>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Use them in other apps, build on them however you want, and if
                  you ever decide to leave, take everything with you.
                </Text>
              </Stack>

              <Stack align="center" gap={'md'} w="100%">
                <Title order={2} ta={'center'} maw={350}>
                  Things you might be wondering about
                </Title>
                <FAQ />
              </Stack>

              <Box pos="relative" w="100%">
                <Image
                  src={CtaSignup.src}
                  alt=""
                  w="100%"
                  h="auto"
                  style={{ zIndex: 0 }}
                />
                <Center pos="absolute" inset={0} px="md">
                  <Stack align="center" gap={'xs'}>
                    <Title order={2} ta={'center'} maw={400}>
                      What matters to you, matters to the network
                    </Title>
                    <Text
                      fw={600}
                      fz={'xl'}
                      c="#1F6144"
                      ta={'center'}
                      maw={340}
                      darkHidden
                    >
                      What will you save to Semble today?
                    </Text>
                    <Text
                      fw={600}
                      fz="xl"
                      c="#1e4dd9"
                      ta={'center'}
                      maw={340}
                      lightHidden
                    >
                      What will you save to Semble today?
                    </Text>
                    <LinkButton
                      href="/signup"
                      rightSection={<BiRightArrowAlt size={18} />}
                    >
                      Get Started
                    </LinkButton>
                  </Stack>
                </Center>
              </Box>

              <Stack align="center" gap={'xl'}>
                <Stack gap={'xs'}>
                  <Title order={2} ta={'center'} maw={400}>
                    What’s the word on Semble?
                  </Title>
                  <Text fw={500} fz="lg" c="dark.2" ta={'center'}>
                    We put them all in{' '}
                    <Anchor
                      href="https://semble.so/profile/cosmik.network/collections/3m53smjjk7527"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="lime"
                      inherit
                    >
                      a collection
                    </Anchor>
                    , of course
                  </Text>
                </Stack>
                <SimpleGrid
                  cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
                  spacing={{ base: 'xl' }}
                  mt={{ base: '1rem' }}
                >
                  {props.testimonials.map((testimonial) => (
                    <Stack key={testimonial.name} gap="xs" align="center">
                      <Anchor
                        href={`https://bsky.app/profile/${testimonial.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="never"
                        c="inherit"
                      >
                        <Group gap={'xs'}>
                          <Avatar
                            src={testimonial.avatar ?? CurateIcon.src}
                            alt={testimonial.name}
                            radius={'xl'}
                          />
                          <Text fw={600} fz="lg">
                            {testimonial.name}
                          </Text>
                        </Group>
                      </Anchor>
                      <Box
                        p="md"
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          background:
                            'radial-gradient(50% 50% at 50% 50%, light-dark(#EFFFD8, rgba(30, 77, 217, 0.12)) 0%, transparent 100%)',
                        }}
                      >
                        <Text fs={'italic'} fw={500} c={'lime'} ta={'center'}>
                          {testimonial.quote}
                        </Text>
                      </Box>
                    </Stack>
                  ))}
                </SimpleGrid>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Center>

      <Footer />
    </Fragment>
  );
}
