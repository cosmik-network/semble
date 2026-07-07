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
} from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import CurateIcon from '@/assets/icons/curate-icon.svg';
import CommunityIcon from '@/assets/icons/community-icon.svg';
import DBIcon from '@/assets/icons/db-icon.svg';
import BigPictureIcon from '@/assets/icons/big-picture-icon.svg';
import SembleLogo from '@/assets/semble-logo.svg';
import Footer from '@/components/landing/footer/Footer';
import { Fragment, Suspense } from 'react';
import AuthButtons from '@/components/landing/authButtons/AuthButtons';
import { IoArrowForward } from 'react-icons/io5';
import NavMenu from '@/components/landing/navMenu/NavMenu';
import { LinkButton } from '@/components/link/MantineLink';
import { BiRightArrowAlt } from 'react-icons/bi';

export default async function Page() {
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
        <Content />
      </Box>
    </Box>
  );
}

function Content() {
  return (
    <Fragment>
      <script async src="https://tally.so/widgets/embed.js" />
      <Container size="xl" p="sm" my="auto">
        <Group justify="space-between">
          <Stack gap={6} align="center">
            <Image src={SembleLogo.src} alt="Semble logo" w={25} h="auto" />
            <Badge size="xs">Alpha</Badge>
          </Stack>
          <NavMenu />
        </Group>
      </Container>

      <Center h="100svh" py={{ base: '2rem', xs: '5rem' }}>
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

            <Stack gap={'xl'}>
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

              <Stack align="center" gap={'xs'}>
                <Title order={2} ta={'center'} maw={350}>
                  Things you might be wondering about
                </Title>
              </Stack>

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
                <Button rightSection={<BiRightArrowAlt size={18} />}>
                  Get Started
                </Button>
              </Stack>

              <Stack align="center" gap={'xl'}>
                <Stack gap={'xs'}>
                  <Title order={2} ta={'center'} maw={400}>
                    What’s the word on Semble?
                  </Title>
                  <Text fw={500} fz="lg" c="dark.2" ta={'center'}>
                    We put them all in a collection, of course
                  </Text>
                </Stack>
                <SimpleGrid
                  cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
                  spacing={{ base: 'xl' }}
                >
                  <Stack gap="xs" align="center">
                    <Group gap={'xs'}>
                      <Avatar src={CurateIcon.src} radius={'xl'} />
                      <Text fw={600} fz="lg">
                        Mark
                      </Text>
                    </Group>
                    <Text fs={'italic'} fw={500} c={'lime'} ta={'center'}>
                      Becoming risky taking a *quick* look @semble.so of a
                      morning...so many inviting rabbit holes to get drawn down!
                    </Text>
                  </Stack>

                  <Stack gap="xs" align="center">
                    <Group gap={'xs'}>
                      <Avatar src={CurateIcon.src} radius={'xl'} />
                      <Text fw={600} fz="lg">
                        Brady Hawkins
                      </Text>
                    </Group>
                    <Text fs={'italic'} fw={500} c={'lime'} ta={'center'}>
                      The articles that people are bookmarking on @semble.so are
                      high quality. It's quickly becoming my go to place to
                      consume dev content
                    </Text>
                  </Stack>

                  <Stack gap="xs" align="center">
                    <Group gap={'xs'}>
                      <Avatar src={CurateIcon.src} radius={'xl'} />
                      <Text fw={600} fz="lg">
                        Victoria
                      </Text>
                    </Group>
                    <Text fs={'italic'} fw={500} c={'lime'} ta={'center'}>
                      “I love seeing notifications about a new connection being
                      added to a card on Semble. Sometimes I discover some cool
                      stuff I haven't seen before.”
                    </Text>
                  </Stack>

                  <Stack gap="xs" align="center">
                    <Group gap={'xs'}>
                      <Avatar src={CurateIcon.src} radius={'xl'} />
                      <Text fw={600} fz="lg">
                        Thoth
                      </Text>
                    </Group>
                    <Text fs={'italic'} fw={500} c={'lime'} ta={'center'}>
                      Memex 2 is happening.
                    </Text>
                  </Stack>
                </SimpleGrid>
              </Stack>
            </Stack>

            <Footer />
          </Stack>
        </Container>
      </Center>
    </Fragment>
  );
}
