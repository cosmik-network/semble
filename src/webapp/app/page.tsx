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
import DarkBG from '@/assets/semble-bg-dark.png';
import CtaSignup from '@/assets/cta-signup.png';
import CtaSignupDark from '@/assets/cta-signup-dark.png';
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
import { Fragment, Suspense } from 'react';
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
      <Container size="xl" p="sm" my="auto">
        <Group justify="space-between" wrap="nowrap" gap="sm">
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
            w={380}
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
        <Container size="xl" p="sm" my="auto">
          <Stack gap="5rem" align="center">
            <Stack gap="xs" align="center" maw={700}>
              <LinkButton
                href={'https://atmosphereconf.org/event/OD6Gd0A'}
                size="compact-sm"
                variant="default"
                rightSection={<IoPlayCircle />}
                style={{
                  color:
                    'light-dark(var(--mantine-color-blue-6), var(--mantine-color-blue-3))',
                  backgroundColor:
                    'light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-6))',
                }}
              >
                Watch: why we're building Semble
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

            <Stack gap={'9rem'} mt={'5rem'}>
              <Stack align="center" gap={'xs'}>
                <Badge variant="default" color="tangerine">
                  Curate
                </Badge>
                <Title order={2} ta={'center'} maw={380}>
                  Turn bookmarks into knowledge trails
                </Title>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
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
                  <Title order={2} ta={'center'} maw={400}>
                    Find your way through the web with the people you trust
                  </Title>
                  <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                    Find high-quality search results powered by the community.
                    Follow and discover interesting curators and collections.
                  </Text>
                  <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
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
                  <Title order={2} ta={'center'} maw={400}>
                    Your workflow, your way
                  </Title>
                  <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                    Integrate Semble into your existing knowledge workflows or
                    create something entirely new.
                  </Text>
                  <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                    Use community-built plugins and automations, or{' '}
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

                        <Group gap={'xs'} mt="sm">
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
                    </Stack>
                  </Card>

                  <Card
                    bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                    radius={'lg'}
                  >
                    <Stack justify="space-between" h="100%">
                      <PiPlugsConnectedFill
                        size={28}
                        color="var(--mantine-color-green-6)"
                      />

                      <Stack gap="xs">
                        <Text fw={600} fz="lg">
                          Plugins
                        </Text>
                        <Text c="dimmed">
                          Community-built plugins and automations — sync your
                          links to Zotero, or use Airglow to sync your Bluesky
                          follows and save links from posts you've liked
                        </Text>

                        <Group gap={'xs'} mt="sm">
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
                    </Stack>
                  </Card>

                  <Card
                    bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                    radius={'lg'}
                  >
                    <Stack justify="space-between" h="100%">
                      <IoMdColorWand
                        size={28}
                        color="var(--mantine-color-green-6)"
                      />

                      <Stack gap="xs">
                        <Text fw={600} fz="lg">
                          MCP
                        </Text>
                        <Text c="dimmed">
                          Connect Semble to Claude and other AI tools over MCP.
                          Ask your library questions and act on it right in your
                          assistant
                        </Text>

                        <Group gap={'xs'} mt="sm">
                          <Button
                            component="a"
                            href="https://www.npmjs.com/package/@semble.so/claude-plugin"
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
                    </Stack>
                  </Card>

                  <Card
                    bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                    radius={'lg'}
                  >
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

                        <Group gap={'xs'} mt="sm">
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
                            Safari soon
                          </Button>
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>
                </SimpleGrid>
              </Stack>

              <Stack align="center" gap={'xs'}>
                <Badge variant="default" color="grape">
                  Yours to keep
                </Badge>
                <Title order={2} ta={'center'} maw={400}>
                  What you make here stays yours
                </Title>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
                  Semble is built on the{' '}
                  <Anchor component="a" href="#open-social" c="blue" inherit>
                    open social web
                  </Anchor>
                  , so your content, identity, and social connections are owned
                  by you, not us.
                </Text>
                <Text fw={500} fz="lg" c="dark.2" ta={'center'} maw={300}>
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
                  <Title order={2} ta={'center'} maw={350}>
                    Things you might be wondering about
                  </Title>
                </Stack>
                <FAQ />
              </Stack>

              <Box pos="relative" w="100%">
                {/* light mode cta bg */}
                <Image
                  src={CtaSignup.src}
                  alt=""
                  w="100%"
                  h="auto"
                  mih={380}
                  fit="cover"
                  style={{
                    zIndex: 0,
                    maskImage:
                      'radial-gradient(ellipse 60% 55% at 50% 50%, black 15%, transparent 80%)',
                    WebkitMaskImage:
                      'radial-gradient(ellipse 60% 55% at 50% 50%, black 15%, transparent 80%)',
                  }}
                  darkHidden
                />

                {/* dark mode cta bg */}
                <Image
                  src={CtaSignupDark.src}
                  alt=""
                  w="100%"
                  h="auto"
                  mih={380}
                  fit="cover"
                  style={{
                    zIndex: 0,
                    maskImage:
                      'radial-gradient(ellipse 60% 55% at 50% 50%, black 15%, transparent 80%)',
                    WebkitMaskImage:
                      'radial-gradient(ellipse 60% 55% at 50% 50%, black 15%, transparent 80%)',
                  }}
                  lightHidden
                />
                <Center pos="absolute" inset={0} px="md">
                  <Stack align="center" gap={'xl'}>
                    <Stack align="center" gap={'xs'}>
                      <Title order={2} ta={'center'} maw={400}>
                        What matters to you, <br /> matters to the network
                      </Title>
                      <Text
                        fw={600}
                        fz={'xl'}
                        c="#1F6144"
                        ta={'center'}
                        maw={350}
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
                    </Stack>
                    <LinkButton
                      href="/signup"
                      size="lg"
                      rightSection={<BiRightArrowAlt size={18} />}
                    >
                      Get Started
                    </LinkButton>

                    <Text fw={600} fz="lg" ta="center" maw={440}>
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
                  </Stack>
                </Center>
              </Box>

              <Stack align="center" gap={'xl'}>
                <Stack gap={'xl'} align="center">
                  <Stack gap={'xs'} align="center">
                    <Title order={2} ta={'center'} maw={400}>
                      What’s the word on Semble?
                    </Title>
                    <Text fw={500} fz="lg" c="dark.2" ta={'center'}>
                      We put them all in{' '}
                      <Anchor
                        href="https://semble.so/profile/cosmik.network/collections/3m53smjjk7527"
                        target="_blank"
                        rel="noopener noreferrer"
                        c="blue"
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
                          <Text fs={'italic'} fw={500} c={'lime'} ta={'center'}>
                            {testimonial.quote}
                          </Text>
                        </Anchor>
                      </Stack>
                    ))}
                  </SimpleGrid>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Center>

      <Footer />
    </Fragment>
  );
}
