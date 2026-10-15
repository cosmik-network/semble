import {
  Anchor,
  BackgroundImage,
  Box,
  Group,
  Stack,
  Image,
  Text,
  Title,
} from '@mantine/core';
import { Suspense, type ReactNode } from 'react';
import { TbStackForward } from 'react-icons/tb';
import { MdOutlineInstallMobile } from 'react-icons/md';
import CosmikLogoWhite from '@/assets/cosmik-logo-full-white.svg';
import ChromeIcon from '@/assets/icons/chrome-icon.svg';
import FirefoxIcon from '@/assets/icons/firefox-icon.svg';
import FooterBG from '@/assets/footer-bg.webp';
import FooterDarkBG from '@/assets/footer-bg-dark.webp';
import EmailSubscribe from '@/components/landing/emailSubscribe/EmailSubscribe';
import LatestPosts from '@/components/landing/latestPosts/LatestPosts';
import styles from './Footer.module.css';

const BROWSER_ICON_SIZE = 17;

const LINK_GROUPS: {
  title: string;
  accent?: boolean;
  links: { label: string; href: string; icon?: ReactNode }[];
}[] = [
  {
    title: 'Get Semble',
    accent: true,
    links: [
      {
        label: 'Chrome',
        href: 'https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg',
        icon: (
          <Image
            src={ChromeIcon.src}
            alt=""
            w={BROWSER_ICON_SIZE}
            h={BROWSER_ICON_SIZE}
          />
        ),
      },
      {
        label: 'Firefox',
        href: 'https://addons.mozilla.org/en-US/firefox/addon/semble/',
        icon: (
          <Image
            src={FirefoxIcon.src}
            alt=""
            w={BROWSER_ICON_SIZE}
            h={BROWSER_ICON_SIZE}
          />
        ),
      },
      {
        label: 'iOS shortcut',
        href: '/ios-shortcut',
        icon: <TbStackForward size={BROWSER_ICON_SIZE} aria-hidden="true" />,
      },
      {
        label: 'Web app',
        href: '/install-app',
        icon: (
          <MdOutlineInstallMobile size={BROWSER_ICON_SIZE} aria-hidden="true" />
        ),
      },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Docs', href: 'https://docs.cosmik.network/semble' },
      { label: 'Blog', href: 'https://blog.cosmik.network/' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Bluesky', href: 'https://bsky.app/profile/semble.so' },
      { label: 'Discord', href: 'https://discord.gg/vq7KzPkhCs' },
      {
        label: 'Give feedback',
        href: 'https://userinput.app/#/s/did:plc:k7wclckeajmuibxbamtbejjg/3mofstjavqb2c',
      },
    ],
  },
  {
    title: 'Open source',
    links: [
      { label: 'GitHub', href: 'https://github.com/cosmik-network/semble' },
      { label: 'Tangled', href: 'https://tangled.org/@cosmik.network/semble' },
      {
        label: 'Report an issue',
        href: 'https://github.com/cosmik-network/semble/issues',
      },
    ],
  },
];

export default function Footer() {
  return (
    <Box component="footer" pos="relative" style={{ overflow: 'hidden' }}>
      <Box
        aria-hidden="true"
        pos="absolute"
        left={0}
        right={0}
        bottom={0}
        h={{ base: 320, sm: 420 }}
      >
        <BackgroundImage
          src={FooterBG.src}
          darkHidden
          pos="absolute"
          inset={0}
          style={{ backgroundPosition: 'bottom center' }}
        />
        <BackgroundImage
          src={FooterDarkBG.src}
          lightHidden
          pos="absolute"
          inset={0}
          style={{ backgroundPosition: 'bottom center' }}
        />
        <Box className={styles.photoFade} pos="absolute" inset={0} />
        <Box className={styles.photoScrim} pos="absolute" inset={0} />
      </Box>

      <Stack
        pos="relative"
        align="center"
        gap="6rem"
        maw={1120}
        mx="auto"
        px="sm"
        pt={{ base: '6rem', md: '9rem' }}
      >
        {/* Same header pattern as the landing page's sections above. */}
        <Stack
          component="section"
          aria-labelledby="team-notes-heading"
          align="center"
          gap="xl"
          w="100%"
        >
          <Stack align="center" gap="xs">
            <Title order={2} id="team-notes-heading" ta="center" maw={400}>
              Notes from the team
            </Title>
            <Text fw={500} fz="lg" c="dimmed" ta="center" maw={320}>
              Monthly updates and essays on building Semble, straight to your
              inbox.
            </Text>
          </Stack>

          <Box w="100%" maw={400}>
            <EmailSubscribe />
          </Box>

          <Suspense fallback={null}>
            <LatestPosts />
          </Suspense>
        </Stack>

        {/* The dashed line and stops reuse the landing page's trail
            connectors; the orange stop marks Semble itself, as in IdentityWeb. */}
        <Box className={styles.trail}>
          {LINK_GROUPS.map((group) => {
            const headingId = `footer-${group.title.toLowerCase().replace(' ', '-')}`;

            return (
              <Box
                key={group.title}
                component="nav"
                aria-labelledby={headingId}
                className={styles.stop}
              >
                <span
                  className={group.accent ? styles.pinAccent : styles.pin}
                  aria-hidden="true"
                />
                <Text
                  component="h3"
                  id={headingId}
                  className={styles.title}
                  fz="md"
                  fw={700}
                  c="bright"
                >
                  {group.title}
                </Text>
                <Box className={styles.linkList}>
                  {group.links.map((link) => {
                    const isExternal = link.href.startsWith('http');

                    return (
                      <Anchor
                        key={link.label}
                        className={styles.link}
                        href={link.href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        fz="0.9375rem"
                        fw={600}
                        underline="never"
                      >
                        {link.icon}
                        {link.label}
                      </Anchor>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Group
          className={styles.credits}
          gap="4px 24px"
          w="100%"
          mt={{ base: 120, sm: 180 }}
          pb="md"
          c="white"
          fw={500}
          ta="center"
        >
          <Group gap={6} justify="center">
            Made by
            <Anchor
              href="https://cosmik.network/"
              target="_blank"
              display="flex"
            >
              <Image src={CosmikLogoWhite.src} alt="Cosmik" w={80} h="auto" />
            </Anchor>
            <span>
              with support from{' '}
              <Anchor
                href="https://coefficientgiving.org/"
                target="_blank"
                c="white"
                fw={700}
                inherit
              >
                Coefficient Giving
              </Anchor>{' '}
              and{' '}
              <Anchor
                href="https://astera.org/"
                target="_blank"
                c="white"
                fw={700}
                inherit
              >
                Astera
              </Anchor>
            </span>
          </Group>
          <Anchor href="/privacy-policy" c="white" fw={600} inherit>
            Privacy policy
          </Anchor>
        </Group>
      </Stack>
    </Box>
  );
}
