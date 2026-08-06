'use client';

import { Group, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import type { IconType } from 'react-icons/lib';
import { FiChrome } from 'react-icons/fi';
import { MdOutlineInstallMobile } from 'react-icons/md';
import { TbBrandFirefox, TbRobot, TbStackForward } from 'react-icons/tb';
import { LinkCard } from '@/components/link/MantineLink';
import tileStyles from '../topicTile/TopicTile.module.css';

const CHROME_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg';
const FIREFOX_EXTENSION_URL =
  'https://addons.mozilla.org/en-US/firefox/addon/semble/';
const MCP_DOCS_URL = 'https://docs.cosmik.network/semble-mcp';

interface InstallOption {
  href: string;
  icon: IconType;
  title: string;
  description: string;
  /** Store listings and docs live elsewhere; the two app routes do not. */
  external?: boolean;
  /** Only offered where the shortcut can actually be installed. */
  iosOnly?: boolean;
}

const OPTIONS: InstallOption[] = [
  {
    href: '/install-app',
    icon: MdOutlineInstallMobile,
    title: 'Web app',
    description: 'Semble on your home screen.',
  },
  {
    href: CHROME_EXTENSION_URL,
    icon: FiChrome,
    title: 'Chrome extension',
    description: 'Save from any page.',
    external: true,
  },
  {
    href: FIREFOX_EXTENSION_URL,
    icon: TbBrandFirefox,
    title: 'Firefox extension',
    description: 'Save from any page.',
    external: true,
  },
  {
    href: '/ios-shortcut',
    icon: TbStackForward,
    title: 'iOS shortcut',
    description: 'Save from the share sheet.',
    iosOnly: true,
  },
  {
    href: MCP_DOCS_URL,
    icon: TbRobot,
    title: 'MCP',
    description: 'Use Semble from Claude.',
    external: true,
  },
];

interface Props {
  /**
   * Runs before the browser follows any card. Marks onboarding complete —
   * picking an install target is the last step, whether or not the click
   * navigates away from this tab.
   */
  onSelect: () => void;
}

/**
 * The install surfaces, laid out in the open.
 *
 * These used to sit behind an "Install Semble" dropdown. A menu is the wrong
 * container for the one thing on this screen that carries Semble past the
 * browser tab: it hid five options behind a click, gave none of them room to
 * say what they do, and read as a settings control rather than an invitation.
 */
export default function InstallOptions(props: Props) {
  // Mantine resolves this after mount, so it is 'undetermined' on the server
  // and on the first client render. That is the point: the iOS card appears
  // once we know the device, and the markup matches on hydration.
  const os = useOs();

  const visible = OPTIONS.filter((option) => !option.iosOnly || os === 'ios');

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={'sm'}>
      {visible.map((option) => (
        <LinkCard
          key={option.href}
          href={option.href}
          {...(option.external && {
            target: '_blank',
            rel: 'noopener noreferrer',
          })}
          onClick={props.onSelect}
          withBorder
          radius={'lg'}
          p={'sm'}
          h={'100%'}
          className={tileStyles.tile}
        >
          <Group gap={'xs'} wrap="nowrap" align="center">
            <ThemeIcon variant="light" color="gray" size={38} radius={'md'}>
              <option.icon size={18} />
            </ThemeIcon>

            <Stack gap={0} miw={0}>
              <Text fw={600} c={'bright'} fz={'sm'} lineClamp={1}>
                {option.title}
              </Text>
              <Text c={'dimmed'} fz={'xs'} lineClamp={1}>
                {option.description}
              </Text>
            </Stack>
          </Group>
        </LinkCard>
      ))}
    </SimpleGrid>
  );
}
