import {
  SimpleGrid,
  Image,
  Text,
  BackgroundImage,
  Title,
  Stack,
  Button,
  Container,
  Box,
  Center,
  Group,
  Badge,
  Grid,
  GridCol,
} from '@mantine/core';
import { BiRightArrowAlt } from 'react-icons/bi';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import CurateIcon from '@/assets/icons/curate-icon.svg';
import CommunityIcon from '@/assets/icons/community-icon.svg';
import DBIcon from '@/assets/icons/db-icon.svg';
import BigPictureIcon from '@/assets/icons/big-picture-icon.svg';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import AnimatedTitle from '@/components/landing/animatedTitle/AnimatedTitle';
import IosShortcutButton from '@/components/landing/iosShortcutButton/IosShortcutButton';
import { Fragment } from 'react';
import Footer from '@/components/landing/footer/Footer';
import RecentActivity from '@/components/landing/recentActivity/RecentActivity';

export default async function Page() {
  const fadeStyle = {
    inset: 0,
    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 35%)',
    maskImage: 'linear-gradient(to top, transparent 0%, black 35%)',
    zIndex: 0,
  };

  return (
    <Box component="section" pos="relative" h="100svh" w="100%">
      {/* light mode bg */}
      <BackgroundImage
        src={BG.src}
        darkHidden
        h="100svh"
        pos={'absolute'}
        style={fadeStyle}
      />

      {/* dark mode bg */}
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        h="100svh"
        pos={'absolute'}
        style={fadeStyle}
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
      <Container size="xl" p="md" my="auto">
        <Group justify="space-between">
          <Stack gap={6} align="center">
            <Image src={SembleLogo.src} alt="Semble logo" w={30} h="auto" />
            <Badge size="sm">Alpha</Badge>
          </Stack>
          <Group gap={'sm'}>
            <IosShortcutButton />
            <Button
              data-tally-open="31a9Ng"
              data-tally-hide-title="1"
              data-tally-layout="modal"
              data-tally-emoji-animation="none"
              variant="default"
              size="sm"
            >
              Stay in the loop
            </Button>
          </Group>
        </Group>
      </Container>

      <Center h="100svh" py={{ base: '2rem', xs: '5rem' }}>
        <Container size="xl" p="md" my="auto">
          <Stack gap="5rem">
            <Grid gutter="xl" align="center">
              <GridCol span={{ sm: 5, md: 6 }}>
                <Stack gap="xs" maw={550}>
                  <AnimatedTitle />

                  {/* light mode subtitle */}
                  <Title order={2} fw={600} fz="xl" c="#1F6144" darkHidden>
                    Follow your peers’ research trails. Surface and discover new
                    connections. Built on ATProto so you own your data.
                  </Title>

                  {/* dark mode subtitle */}
                  <Title order={2} fw={600} fz="xl" c="#1e4dd9" lightHidden>
                    Follow your peers’ research trails. Surface and discover new
                    connections. Built on ATProto so you own your data.
                  </Title>

                  <Group gap="md" mt="lg">
                    <Button component={Link} href="/signup" size="lg">
                      Sign up
                    </Button>

                    <Button
                      component={Link}
                      href="/login"
                      size="lg"
                      color="var(--mantine-color-dark-filled)"
                      rightSection={<BiRightArrowAlt size={22} />}
                    >
                      Log in
                    </Button>
                  </Group>
                </Stack>
              </GridCol>

              <GridCol span={{ sm: 7, md: 6 }}>
                <RecentActivity />
              </GridCol>
            </Grid>

            <SimpleGrid
              cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
              spacing={{ base: 'xl' }}
              mt={{ base: '1rem', xs: '5rem' }}
            >
              <Stack gap="xs">
                <Image src={CurateIcon.src} alt="Curate icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    Curate your research trails.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    Collect interesting links, add notes, and organize them into
                    shareable collections. Build trails others can explore and
                    extend.
                  </Text>
                </Text>
              </Stack>
              <Stack gap="xs">
                <Image src={CommunityIcon.src} alt="Community icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    Connect with peers.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    See what your peers are sharing and find new collaborators
                    with shared interests. Experience research rabbit holes,
                    together.
                  </Text>
                </Text>
              </Stack>
              <Stack gap="xs">
                <Image src={DBIcon.src} alt="Database icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    Own your data.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    Built on ATProto, new apps will come to you. No more
                    rebuilding your social graph and data when apps pivot and
                    shut down.
                  </Text>
                </Text>
              </Stack>
              <Stack gap="xs">
                <Image src={BigPictureIcon.src} alt="Big picture icon" w={28} />
                <Text>
                  <Text fw={600} fz="lg" span>
                    See the bigger picture.
                  </Text>{' '}
                  <Text fw={500} fz="lg" c="dark.2" span>
                    Find what&apos;s relevant through your network. Get the
                    extra context that matters before you dive into content.
                  </Text>
                </Text>
              </Stack>
            </SimpleGrid>

            <Footer />
          </Stack>
        </Container>
      </Center>
    </Fragment>
  );
}
