import type { IconType } from 'react-icons';
import { TbCode, TbPlug, TbPuzzle, TbSparkles } from 'react-icons/tb';
import ChromeIcon from '@/assets/icons/chrome-icon.svg';
import FirefoxIcon from '@/assets/icons/firefox-icon.svg';
import SafariIcon from '@/assets/icons/safari-icon.svg';
import ZoteroIcon from '@/assets/icons/zotero-icon.svg';
import ObsidianIcon from '@/assets/icons/obsidian-icon.svg';
import AirglowIcon from '@/assets/icons/airglow-icon.svg';
import ClaudeIcon from '@/assets/icons/claude-icon.svg';

export interface Integration {
  name: string;
  description: string;
  // No href means it isn't available yet.
  href?: string;
  // Falls back to the group's icon when there's no brand logo.
  logo?: string;
}

export interface IntegrationGroup {
  title: string;
  description: string;
  Icon: IconType;
  integrations: Integration[];
}

export const extension: IntegrationGroup = {
  title: 'Web extension',
  description:
    'Save from anywhere. Organize your links. Find related content. Discover new connections',
  Icon: TbPuzzle,
  integrations: [
    {
      name: 'Chrome',
      description: 'Chrome Web Store',
      href: 'https://chromewebstore.google.com/detail/semble/dciebmpcjkmjbcgfdlinfgpjimhhchlg',
      logo: ChromeIcon.src,
    },
    {
      name: 'Firefox',
      description: 'Firefox Add-ons',
      href: 'https://addons.mozilla.org/en-US/firefox/addon/semble/',
      logo: FirefoxIcon.src,
    },
    {
      name: 'Safari',
      description: 'Coming soon',
      logo: SafariIcon.src,
    },
  ],
};

export const plugins: IntegrationGroup = {
  title: 'Plugins',
  description:
    'Community-built plugins and automations that bring Semble into the tools you already use',
  Icon: TbPlug,
  integrations: [
    {
      name: 'Zotero',
      description: 'Sync your links to Zotero',
      href: 'https://github.com/ChrisShank/zemble/releases/tag/v0.0.5',
      logo: ZoteroIcon.src,
    },
    {
      name: 'Obsidian',
      description: 'Save links from your notes',
      href: 'https://community.obsidian.md/plugins/semble-collect',
      logo: ObsidianIcon.src,
    },
    {
      name: 'Airglow',
      description: 'Sync Bluesky follows, save links from likes',
      href: 'https://airglow.run/automations/all?q=semble',
      logo: AirglowIcon.src,
    },
  ],
};

export const mcp: IntegrationGroup = {
  title: 'MCP',
  description:
    'Connect Semble to Claude and other AI tools over MCP. Ask your library questions and act on it right in your assistant',
  Icon: TbSparkles,
  integrations: [
    {
      name: 'Set up in Claude',
      description: 'Or Cursor, ChatGPT & more',
      href: 'https://docs.cosmik.network/semble-mcp',
      logo: ClaudeIcon.src,
    },
  ],
};

export const api: IntegrationGroup = {
  title: 'API',
  description:
    'Integrate Semble with your own workflow. Showcase your collections on your website. Build your own client or something completely new',
  Icon: TbCode,
  integrations: [
    {
      name: 'API docs',
      description: 'Endpoints and API keys',
      href: 'https://docs.cosmik.network/semble-api',
    },
  ],
};
