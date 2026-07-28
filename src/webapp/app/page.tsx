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
  Card,
  Anchor,
  Avatar,
  Button,
  Badge,
} from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.webp';
import CtaSignup from '@/assets/cta-signup.webp';
import CtaSignupDark from '@/assets/cta-signup-dark.webp';
import ClaudeIcon from '@/assets/icons/claude-icon.svg';
import ZoteroIcon from '@/assets/icons/zotero-icon.svg';
import AirglowIcon from '@/assets/icons/airglow-icon.svg';
import ChromeIcon from '@/assets/icons/chrome-icon.svg';
import FirefoxIcon from '@/assets/icons/firefox-icon.svg';
import SafariIcon from '@/assets/icons/safari-icon.svg';
import SembleLogo from '@/assets/semble-logo-full.svg';
import Footer from '@/components/landing/footer/Footer';
import FAQ from '@/components/landing/faq/FAQ';
import BrowserTabs from '@/components/landing/browserTabs/BrowserTabs';
import KnowledgeTrail from '@/components/landing/knowledgeTrail/KnowledgeTrail';
import OrbitalHero from '@/components/landing/orbitalHero/OrbitalHero';
import IdentityWeb from '@/components/landing/identityWeb/IdentityWeb';
import HeaderSearchBar from '@/components/landing/headerSearchBar/HeaderSearchBar';
import GetExtensionMenu from '@/components/landing/getExtensionMenu/GetExtensionMenu';
import TreeShadows from '@/components/landing/treeShadows/TreeShadows';
import { Fragment } from 'react';
import AuthButtons from '@/components/landing/authButtons/AuthButtons';
import { IoPlayCircle } from 'react-icons/io5';
import { LinkButton } from '@/components/link/MantineLink';
import { BiRightArrowAlt } from 'react-icons/bi';
import { IoMdCode, IoMdColorWand } from 'react-icons/io';
import { PiPlugsConnectedFill, PiPuzzlePieceBold } from 'react-icons/pi';
import { TbStackForward } from 'react-icons/tb';
import { MdOutlineInstallMobile } from 'react-icons/md';
import { getBlueskyProfile } from '@/features/platforms/bluesky/lib/dal';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import Script from 'next/script';

// Type scale — fluid so the steps hold from mobile to desktop.
const HERO_TITLE_SIZE = 'clamp(2.5rem, 6.5vw, 3.75rem)';
const SECTION_TITLE_SIZE = 'clamp(1.75rem, 3.5vw, 2.125rem)';

// Replaces c="dark.2" (#828282), which failed WCAG AA in both schemes.
const SECONDARY_TEXT =
  'light-dark(var(--mantine-color-stone-6), var(--mantine-color-dark-1))';

// Testimonial quotes. Mantine's lime.6 (#82c91e) sat at ~2:1 on the pale green
// quote card; the brand green clears 7:1 on it, and lime.3 clears AA on dark.
const QUOTE_TEXT = 'light-dark(#1F6144, var(--mantine-color-lime-3))';

// Copy widths: fill the container's padding on mobile, capped on desktop so
// centered text keeps a comfortable measure instead of a narrow ribbon.
// In ch, not px, so the measure tracks the font size instead of drifting as the
// type scale changes. Centered copy wants a shorter measure than left-aligned
// (the eye has no fixed left edge to return to). Titles tolerate a longer measure
// than body — they're read as a single unit — so 40ch keeps the short ones
// ("Turn bookmarks into knowledge trails", 36 chars) on one line while the
// longest still balances onto two.
const TITLE_WIDTH = { base: '100%', sm: '40ch' };
const BODY_WIDTH = { base: '100%', sm: '52ch' };

// Evens out the line lengths so short centered blocks don't end on an orphan
// word. Browsers stop balancing past ~6 lines, which is exactly this copy.
const BALANCE = { textWrap: 'balance' as const };

// CTA artwork. Drawn as a CSS background rather than an <img> so the browser
// skips the layer for the inactive colour scheme — a hidden <img> still fetches
// its src, a background on a display:none element does not.
const CTA_MASK =
  'radial-gradient(ellipse 60% 55% at 50% 50%, black 15%, transparent 80%)';
const ctaArtwork = (src: string) => ({
  backgroundImage: `url(${src})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  maskImage: CTA_MASK,
  WebkitMaskImage: CTA_MASK,
});

const testimonials = [
  {
    name: 'Mark',
    handle: 'uppy-hacker.bsky.social',
    quote:
      'Becoming risky taking a *quick* look @semble.so of a morning...so many inviting rabbit holes to get drawn down!',
    postUrl:
      'https://bsky.app/profile/uppy-hacker.bsky.social/post/3mfncyruev22l',
  },
  {
    name: 'Brady Hawkins',
    handle: 'bradyhawkins.dev',
    quote:
      "The articles that people are bookmarking on @semble.so are high quality. It's quickly becoming my go to place to consume dev content",
    postUrl: 'https://bsky.app/profile/bradyhawkins.dev/post/3mgnax5m5222w',
  },
  {
    name: 'Victoria',
    handle: 'vicwalker.dev.br',
    quote:
      "“I love seeing notifications about a new connection being added to a card on Semble. Sometimes I discover some cool stuff I haven't seen before.”",
    postUrl: 'https://bsky.app/profile/vicwalker.dev.br/post/3mk2guqehac23',
  },
  {
    name: 'Thoth',
    handle: 'thoth.ptnote.dev',
    quote: 'Memex 2 is happening.',
    postUrl: 'https://bsky.app/profile/thoth.ptnote.dev/post/3mj3owskr6s2t',
  },
];

export default async function Page() {
  const [profiles, session] = await Promise.all([
    Promise.all(testimonials.map((t) => getBlueskyProfile(t.handle))),
    verifySessionOnServer(),
  ]);
  const testimonialsWithAvatars = testimonials.map((t, i) => ({
    ...t,
    avatar: profiles[i]?.avatar ?? null,
  }));

  return (
    // overflowAnchor: Chrome's scroll anchoring compensates frame-by-frame while
    // a collapse animates open, dragging the clicked FAQ question up out of
    // view. Scoped to this page rather than <body> — the feeds need anchoring to
    // hold position while off-screen cards resolve and resize.
    <Box
      component="section"
      pos="relative"
      h="100svh"
      w="100%"
      style={{ overflowAnchor: 'none' }}
    >
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
        {/* subtle tree shadows filling the gap between hero and footer */}
        <TreeShadows />
        <Content
          testimonials={testimonialsWithAvatars}
          isAuthenticated={!!session}
        />
      </Box>
    </Box>
  );
}

function Content(props: {
  testimonials: {
    name: string;
    handle: string;
    quote: string;
    postUrl: string;
    avatar: string | null;
  }[];
  isAuthenticated: boolean;
}) {
  return (
    <Fragment>
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
      <Container
        size="xl"
        p="sm"
        px={{
          base: 'lg',
          xs: 'md',
          sm: 'xl',
          md: '3rem',
          lg: '5rem',
          xl: '6rem',
        }}
        my="auto"
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          {/* md+: flex={1} makes left/right spacers equal so the search bar is
                perfectly centered (original look). Below md they shrink to their
                content so the buttons never clip and the search bar gives up space. */}
          <Group flex={{ base: '0 0 auto', md: 1 }}>
            <Image
              src={SembleLogo.src}
              alt="Semble logo"
              w={110}
              h="auto"
              style={{ flexShrink: 0 }}
            />
          </Group>
          <Box
            flex={{ base: '0 1 auto', md: '0 0 auto' }}
            w={340}
            maw="100%"
            mx="md"
            visibleFrom="sm"
          >
            <HeaderSearchBar />
          </Box>
          <Group
            flex={{ base: '0 0 auto', md: 1 }}
            justify="flex-end"
            wrap="nowrap"
            style={{ flexShrink: 0 }}
          >
            <GetExtensionMenu />
            {!props.isAuthenticated && (
              <LinkButton href="/login" size="sm" variant="inverse">
                Log in
              </LinkButton>
            )}
          </Group>
        </Group>
      </Container>

      <Center mih="100svh" pt={{ base: '2rem', xs: '5rem' }}>
        <Container
          size="xl"
          p={{ base: 'md', xs: 'sm' }}
          px={{
            base: 'lg',
            xs: 'md',
            sm: 'xl',
            md: '3rem',
            lg: '5rem',
            xl: '6rem',
          }}
          my="auto"
        >
          <Stack gap="clamp(3rem, 8vw, 5rem)" align="center">
            <Stack gap="xs" align="center" maw={780}>
              <LinkButton
                href={'https://atmosphereconf.org/event/OD6Gd0A'}
                size="compact-sm"
                variant="default"
                mb="md"
                rightSection={<IoPlayCircle />}
                style={{
                  color:
                    'light-dark(var(--mantine-color-blue-6), var(--mantine-color-blue-3))',
                  backgroundColor:
                    'light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))',
                  borderColor:
                    'light-dark(var(--mantine-color-blue-2), rgba(35, 175, 237, 0.25))',
                }}
              >
                Watch: why we're building Semble
              </LinkButton>
              <Title
                order={1}
                fw={700}
                fz={HERO_TITLE_SIZE}
                lh={1.05}
                lts="-0.02em"
                ta={'center'}
              >
                Save what matters <br /> Make sense of it together
              </Title>

              {/* light mode subtitle */}
              <Text
                fw={500}
                fz={'lg'}
                c="#1F6144"
                ta={'center'}
                maw={460}
                mt="sm"
                darkHidden
              >
                Semble is a collaborative space for mapping the web, connecting
                ideas, and building shared knowledge
              </Text>

              {/* dark mode subtitle */}
              <Text
                fw={500}
                fz="lg"
                c="#1e4dd9"
                ta={'center'}
                maw={460}
                mt="sm"
                lightHidden
              >
                Semble is a collaborative space for mapping the web, connecting
                ideas, and building shared knowledge
              </Text>

              <AuthButtons />
            </Stack>

            {/* Social proof sits right under the hero CTA, before the feature
                    sections make their own case. Outside the hero's maw={780} so
                    the quotes spread into a band rather than a narrow column. */}
            <Stack align="center" gap={'md'}>
              <SimpleGrid
                cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
                spacing={{ base: 'xl' }}
              >
                {props.testimonials.map((testimonial) => (
                  <Stack key={testimonial.name} gap="xs" align="center">
                    <Group gap={'xs'}>
                      <Avatar
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        radius={'xl'}
                      />
                      <Text fw={600} fz="lg">
                        {testimonial.name}
                      </Text>
                    </Group>
                    <Anchor
                      href={testimonial.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="never"
                      p="md"
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        background:
                          'radial-gradient(50% 50% at 50% 50%, light-dark(#EFFFD8, rgba(30, 77, 217, 0.12)) 0%, transparent 100%)',
                      }}
                    >
                      <Text fs={'italic'} fw={500} c={QUOTE_TEXT} ta={'center'}>
                        {testimonial.quote}
                      </Text>
                    </Anchor>
                  </Stack>
                ))}
              </SimpleGrid>

              <Button
                component="a"
                href="https://semble.so/profile/cosmik.network/collections/3m53smjjk7527"
                target="_blank"
                rel="noopener noreferrer"
                size="compact-sm"
                radius="xl"
                variant="default"
                rightSection={<BiRightArrowAlt size={16} />}
              >
                More mentions, in a collection
              </Button>
            </Stack>

            <Stack
              gap="clamp(4.5rem, 12vw, 9rem)"
              mt="clamp(2.5rem, 6vw, 5rem)"
            >
              <Stack align="center" gap={'xs'}>
                <Badge variant="default" color="tangerine">
                  Curate
                </Badge>
                <Title
                  order={2}
                  fz={SECTION_TITLE_SIZE}
                  lh={1.15}
                  ta={'center'}
                  maw={TITLE_WIDTH}
                  style={BALANCE}
                >
                  Turn bookmarks into knowledge trails
                </Title>
                <Text
                  fw={500}
                  fz="md"
                  c={SECONDARY_TEXT}
                  ta={'center'}
                  maw={BODY_WIDTH}
                  style={BALANCE}
                >
                  Save links, connect related ideas, and curate collections on
                  your own or collaboratively.
                </Text>
                <Box mt="md" w="100%" py="lg">
                  <Stack align="center" gap={'xs'}>
                    <Text fw={600} c={'tangerine'}>
                      Every link you add becomes a starting point...
                    </Text>
                    <BrowserTabs />
                  </Stack>
                </Box>
                <Box w="100%">
                  <KnowledgeTrail />
                </Box>
              </Stack>

              <Stack align="center" gap={'xl'}>
                <Stack align="center" gap={'xs'}>
                  <Badge variant="default" color="blue">
                    Discover
                  </Badge>
                  <Title
                    order={2}
                    fz={SECTION_TITLE_SIZE}
                    lh={1.15}
                    ta={'center'}
                    maw={TITLE_WIDTH}
                    style={BALANCE}
                  >
                    Find your way through the web with the people you trust
                  </Title>
                  <Text
                    fw={500}
                    fz="md"
                    c={SECONDARY_TEXT}
                    ta={'center'}
                    maw={BODY_WIDTH}
                    style={BALANCE}
                  >
                    Find high-quality search results powered by the community.
                    Follow and discover interesting curators and collections.
                  </Text>
                  <Text
                    fw={500}
                    fz="md"
                    c={SECONDARY_TEXT}
                    ta={'center'}
                    maw={BODY_WIDTH}
                    style={BALANCE}
                  >
                    Tune your notifications to the interactions that matter to
                    you. Explore a living map of the web that you helped create.
                  </Text>
                </Stack>
                <Box w="100%" mt={{ base: '1rem', md: '2rem' }}>
                  <OrbitalHero />
                </Box>
              </Stack>

              <Stack align="center" gap={'xl'}>
                <Stack align="center" gap={'xs'}>
                  <Badge variant="default" color="green">
                    Extend
                  </Badge>
                  <Title
                    order={2}
                    fz={SECTION_TITLE_SIZE}
                    lh={1.15}
                    ta={'center'}
                    maw={TITLE_WIDTH}
                    style={BALANCE}
                  >
                    Your workflow, your way
                  </Title>
                  <Text
                    fw={500}
                    fz="md"
                    c={SECONDARY_TEXT}
                    ta={'center'}
                    maw={BODY_WIDTH}
                    style={BALANCE}
                  >
                    Integrate Semble into your existing knowledge workflows or
                    create something entirely new.
                  </Text>
                  <Text
                    fw={500}
                    fz="md"
                    c={SECONDARY_TEXT}
                    ta={'center'}
                    maw={BODY_WIDTH}
                    style={BALANCE}
                  >
                    Use community-built plugins and automations or{' '}
                    <Anchor
                      href="https://docs.cosmik.network/semble-api"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="blue"
                      inherit
                    >
                      tap the API
                    </Anchor>{' '}
                    to build your own — all on top of a living network.
                  </Text>
                </Stack>

                <Stack gap={'md'} align="center">
                  <SimpleGrid
                    cols={{ base: 1, xs: 2 }}
                    spacing={{ base: 'xs' }}
                    mt={{ base: '1rem' }}
                    maw={900}
                  >
                    <Card
                      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                      radius={'lg'}
                    >
                      <Group align="flex-start" wrap="nowrap" gap="md" h="100%">
                        <IoMdCode
                          size={28}
                          color="var(--mantine-color-green-6)"
                          style={{ flexShrink: 0 }}
                        />

                        <Stack gap="xs" h="100%">
                          <Text fw={600} fz="lg">
                            API
                          </Text>
                          <Text c="dimmed">
                            Integrate Semble with your own workflow. Showcase
                            your collections on your website. Build your own
                            client or something completely new{' '}
                          </Text>

                          <Group gap={'xs'} mt="auto" pt="sm">
                            <Button
                              component="a"
                              href="https://docs.cosmik.network/semble-api"
                              target="_blank"
                              rel="noopener noreferrer"
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              rightSection={<BiRightArrowAlt size={16} />}
                            >
                              API docs
                            </Button>
                          </Group>
                        </Stack>
                      </Group>
                    </Card>

                    <Card
                      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                      radius={'lg'}
                    >
                      <Group align="flex-start" wrap="nowrap" gap="md" h="100%">
                        <PiPlugsConnectedFill
                          size={28}
                          color="var(--mantine-color-green-6)"
                          style={{ flexShrink: 0 }}
                        />

                        <Stack gap="xs" h="100%">
                          <Text fw={600} fz="lg">
                            Plugins
                          </Text>
                          <Text c="dimmed">
                            Community-built plugins and automations — sync your
                            links to Zotero, or use Airglow to sync your Bluesky
                            follows and save links from posts you've liked
                          </Text>

                          <Group gap={'xs'} mt="auto" pt="sm">
                            <Button
                              component="a"
                              href="https://github.com/ChrisShank/zemble/releases/tag/v0.0.5"
                              target="_blank"
                              rel="noopener noreferrer"
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              leftSection={
                                <Image
                                  src={ZoteroIcon.src}
                                  alt=""
                                  w={14}
                                  h={14}
                                  fit="contain"
                                />
                              }
                            >
                              Zotero plugin
                            </Button>
                            <Button
                              component="a"
                              href="https://airglow.run/automations/all?q=semble"
                              target="_blank"
                              rel="noopener noreferrer"
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              leftSection={
                                <Image
                                  src={AirglowIcon.src}
                                  alt=""
                                  w={16}
                                  h={16}
                                  fit="contain"
                                />
                              }
                            >
                              Airglow automations
                            </Button>
                          </Group>
                        </Stack>
                      </Group>
                    </Card>

                    <Card
                      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                      radius={'lg'}
                    >
                      <Group align="flex-start" wrap="nowrap" gap="md" h="100%">
                        <IoMdColorWand
                          size={28}
                          color="var(--mantine-color-green-6)"
                          style={{ flexShrink: 0 }}
                        />

                        <Stack gap="xs" h="100%">
                          <Text fw={600} fz="lg">
                            MCP
                          </Text>
                          <Text c="dimmed">
                            Connect Semble to Claude and other AI tools over
                            MCP. Ask your library questions and act on it right
                            in your assistant
                          </Text>

                          <Group gap={'xs'} mt="auto" pt="sm">
                            <Button
                              component="a"
                              href="https://docs.cosmik.network/semble-mcp"
                              target="_blank"
                              rel="noopener noreferrer"
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              leftSection={
                                <Image
                                  src={ClaudeIcon.src}
                                  alt=""
                                  w={16}
                                  h={16}
                                  fit="contain"
                                />
                              }
                            >
                              Claude plugin
                            </Button>
                          </Group>
                        </Stack>
                      </Group>
                    </Card>

                    <Card
                      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                      radius={'lg'}
                    >
                      <Group align="flex-start" wrap="nowrap" gap="md" h="100%">
                        <PiPuzzlePieceBold
                          size={28}
                          color="var(--mantine-color-green-6)"
                          style={{ flexShrink: 0 }}
                        />

                        <Stack gap="xs" h="100%">
                          <Text fw={600} fz="lg">
                            Web extension
                          </Text>

                          <Text c="dimmed">
                            Save from anywhere. Organize your links. Find
                            related content. Discover new connections
                          </Text>

                          <Group gap={'xs'} mt="auto" pt="sm">
                            <Button
                              component="a"
                              href="https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg"
                              target="_blank"
                              rel="noopener noreferrer"
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              leftSection={
                                <Image
                                  src={ChromeIcon.src}
                                  alt=""
                                  w={16}
                                  h={16}
                                  fit="contain"
                                />
                              }
                            >
                              Chrome
                            </Button>
                            <Button
                              component="a"
                              href="https://addons.mozilla.org/en-US/firefox/addon/semble/"
                              target="_blank"
                              rel="noopener noreferrer"
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              leftSection={
                                <Image
                                  src={FirefoxIcon.src}
                                  alt=""
                                  w={16}
                                  h={16}
                                  fit="contain"
                                />
                              }
                            >
                              Firefox
                            </Button>
                            <Button
                              size="compact-sm"
                              radius="xl"
                              variant="default"
                              disabled
                              leftSection={
                                <Image
                                  src={SafariIcon.src}
                                  alt=""
                                  w={16}
                                  h={16}
                                  fit="contain"
                                />
                              }
                            >
                              Safari coming soon
                            </Button>
                          </Group>
                        </Stack>
                      </Group>
                    </Card>
                  </SimpleGrid>

                  <Text
                    fw={500}
                    fz="sm"
                    c={SECONDARY_TEXT}
                    ta="center"
                    maw={400}
                  >
                    See what people are building in the{' '}
                    <Anchor
                      href="https://semble.so/profile/semble.so/collections/3mrbbmxuv3m2f"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="blue"
                      inherit
                    >
                      Community Contributions
                    </Anchor>{' '}
                    and{' '}
                    <Anchor
                      href="https://semble.so/profile/cosmik.network/collections/3m55qi4wrlr2h"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="blue"
                      inherit
                    >
                      Community Tinkering
                    </Anchor>{' '}
                    collections
                  </Text>
                </Stack>
              </Stack>

              <Stack align="center" gap={'xs'}>
                <Badge variant="default" color="grape">
                  Yours to keep
                </Badge>
                <Title
                  order={2}
                  fz={SECTION_TITLE_SIZE}
                  lh={1.15}
                  ta={'center'}
                  maw={TITLE_WIDTH}
                  style={BALANCE}
                >
                  What you make here stays yours
                </Title>
                <Text
                  fw={500}
                  fz="md"
                  c={SECONDARY_TEXT}
                  ta={'center'}
                  maw={BODY_WIDTH}
                  style={BALANCE}
                >
                  Semble is built on the{' '}
                  <Anchor component="a" href="#open-social" c="blue" inherit>
                    open social web
                  </Anchor>
                  , so your content, identity, and social connections are owned
                  by you, not us.
                </Text>
                <Text
                  fw={500}
                  fz="md"
                  c={SECONDARY_TEXT}
                  ta={'center'}
                  maw={BODY_WIDTH}
                  style={BALANCE}
                >
                  Use them in other apps, build on them however you want, and if
                  you ever decide to leave, take everything with you.
                </Text>
                <Box w="100%">
                  <IdentityWeb />
                </Box>
              </Stack>

              <Stack align="center" gap={'xl'} w="100%">
                <Stack align="center" gap={'xs'}>
                  <Badge variant="default" color="gray">
                    FAQ
                  </Badge>
                  <Title
                    order={2}
                    fz={SECTION_TITLE_SIZE}
                    lh={1.15}
                    ta={'center'}
                    maw={TITLE_WIDTH}
                    style={BALANCE}
                  >
                    Things you might be wondering about
                  </Title>
                </Stack>
                <FAQ />
              </Stack>

              {/* Closing block: the hook, the CTA, and the ways to take Semble
                    with you. The quotes that used to follow it moved up under the
                    hero. The artwork is an absolute layer behind the copy, so the
                    section is sized by its content instead of by a fixed image
                    box — it survives the copy growing or shrinking. */}
              <Box pos="relative" w="100%">
                {/* light mode cta bg */}
                <Box
                  pos="absolute"
                  inset={0}
                  darkHidden
                  style={{
                    ...ctaArtwork(CtaSignup.src),
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                />

                {/* dark mode cta bg */}
                <Box
                  pos="absolute"
                  inset={0}
                  lightHidden
                  style={{
                    ...ctaArtwork(CtaSignupDark.src),
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                />

                {/* justify="center" so the copy sits centred in the artwork's
                        380px like it did as an overlay, now that the block is
                        short again. */}
                <Stack
                  align="center"
                  justify="center"
                  gap={'xl'}
                  pos="relative"
                  px="md"
                  py={{ base: '2.5rem', sm: '4rem' }}
                  mih={380}
                  style={{ zIndex: 1 }}
                >
                  <Title
                    order={2}
                    fz={SECTION_TITLE_SIZE}
                    lh={1.15}
                    ta={'center'}
                    maw={TITLE_WIDTH}
                    style={BALANCE}
                  >
                    What matters to you, <br /> matters to the network
                  </Title>

                  {/* Wider than BODY_WIDTH: this is four link chips whose
                            icon+label pairs can't break (whiteSpace: nowrap), so a
                            body measure forces ragged lines around them. */}
                  <Text
                    fw={600}
                    fz="lg"
                    ta="center"
                    maw={{ base: '100%', sm: '64ch' }}
                    style={BALANCE}
                  >
                    Take Semble with you — get the extension for{' '}
                    <Anchor
                      href="https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="light-dark(#1F6144, #1e4dd9)"
                      inherit
                      underline="always"
                      style={{
                        textUnderlineOffset: 5,
                        textDecorationThickness: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Image
                        src={ChromeIcon.src}
                        alt=""
                        w={17}
                        h={17}
                        fit="contain"
                        display="inline-block"
                        style={{ verticalAlign: '-3px', marginRight: 4 }}
                      />
                      Chrome
                    </Anchor>{' '}
                    or{' '}
                    <Anchor
                      href="https://addons.mozilla.org/en-US/firefox/addon/semble/"
                      target="_blank"
                      rel="noopener noreferrer"
                      c="light-dark(#1F6144, #1e4dd9)"
                      inherit
                      underline="always"
                      style={{
                        textUnderlineOffset: 5,
                        textDecorationThickness: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Image
                        src={FirefoxIcon.src}
                        alt=""
                        w={17}
                        h={17}
                        fit="contain"
                        display="inline-block"
                        style={{ verticalAlign: '-3px', marginRight: 4 }}
                      />
                      Firefox
                    </Anchor>
                    , or save on the go with the{' '}
                    <Anchor
                      href="/ios-shortcut"
                      target="_blank"
                      c="light-dark(#1F6144, #1e4dd9)"
                      inherit
                      underline="always"
                      style={{
                        textUnderlineOffset: 5,
                        textDecorationThickness: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <TbStackForward
                        size={17}
                        style={{ verticalAlign: '-3px', marginRight: 4 }}
                      />
                      iOS shortcut
                    </Anchor>{' '}
                    or the{' '}
                    <Anchor
                      href="/install-app"
                      target="_blank"
                      c="light-dark(#1F6144, #1e4dd9)"
                      inherit
                      underline="always"
                      style={{
                        textUnderlineOffset: 5,
                        textDecorationThickness: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <MdOutlineInstallMobile
                        size={17}
                        style={{ verticalAlign: '-3px', marginRight: 4 }}
                      />
                      web app
                    </Anchor>
                    .
                  </Text>

                  <LinkButton
                    href="/signup"
                    size="lg"
                    rightSection={<BiRightArrowAlt size={18} />}
                  >
                    Get Started
                  </LinkButton>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </Container>
      </Center>

      <Footer />
    </Fragment>
  );
}
