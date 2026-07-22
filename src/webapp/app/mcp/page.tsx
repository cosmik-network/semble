'use client';

import {
  Anchor,
  Button,
  Container,
  Group,
  Image,
  List,
  ListItem,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  TimelineItem,
  Title,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import {
  MdOutlineFileDownload,
  MdOutlineExtension,
  MdOutlineKey,
} from 'react-icons/md';
import { BiRightArrowAlt } from 'react-icons/bi';
import { FaNpm, FaGithub } from 'react-icons/fa6';
import ClaudeIcon from '@/assets/icons/claude-icon.svg';
import GuideHeader from '@/components/guides/GuideHeader';
import GuideFooter from '@/components/guides/GuideFooter';
import { LinkButton } from '@/components/link/MantineLink';

const marketplaceInstallCode = `/plugin marketplace add https://raw.githubusercontent.com/cosmik-network/semble-claude-plugin/main/marketplace/marketplace.json
/plugin install semble`;

const npmInstallCode = `/plugin install npm:@semble.so/claude-plugin`;

const examplePrompts = [
  '"Save this URL to my AI-safety collection and add a note."',
  '"Research what Semble has on discourse graphs — find the key papers, curators, and collections."',
  '"Catch me up on Semble — what happened in my network this week?"',
  '"Connect this paper to that one as SUPPORTS."',
];

export default function McpPage() {
  return (
    <Container size="xs" p="md" py="xl">
      <Stack gap="xl">
        <GuideHeader
          title="Semble for Claude"
          subtitle="Save links, build collections, and explore your knowledge network from any conversation."
        />

        <Paper radius="lg" p="xl" bg="var(--mantine-color-default-hover)">
          <Stack align="center" gap="lg">
            <ThemeIcon
              size={72}
              radius="lg"
              variant="white"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <Image
                src={ClaudeIcon.src}
                alt="Claude"
                w={36}
                h={36}
                fit="contain"
              />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Title order={3} ta="center">
                Bring Semble into Claude
              </Title>
              <Text c="dimmed" fw={500} ta="center" maw={370}>
                The Semble plugin gives Claude the full Semble toolkit — cards,
                collections, typed connections, feeds, notifications, semantic
                search, and your social graph.
              </Text>
            </Stack>
            <Group gap="xs">
              <Button
                component="a"
                href="https://www.npmjs.com/package/@semble.so/claude-plugin"
                target="_blank"
                rel="noopener noreferrer"
                radius="xl"
                variant="default"
                leftSection={<FaNpm size={18} />}
              >
                View on npm
              </Button>
              <Button
                component="a"
                href="https://github.com/cosmik-network/semble-claude-plugin"
                target="_blank"
                rel="noopener noreferrer"
                radius="xl"
                variant="default"
                leftSection={<FaGithub size={16} />}
              >
                GitHub
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Stack gap="md">
          <Stack gap={4}>
            <Title order={3}>1. Get an API key</Title>
            <Text c="dimmed" fw={500}>
              The plugin authenticates with a Semble API key. It's stored in
              your OS keychain and never written to disk in plaintext.
            </Text>
          </Stack>
          <Group>
            <LinkButton
              href="/settings/api-keys"
              variant="light"
              radius="xl"
              leftSection={<MdOutlineKey size={18} />}
              rightSection={<BiRightArrowAlt size={18} />}
            >
              Create an API key
            </LinkButton>
          </Group>
        </Stack>

        <Stack gap="md">
          <Stack gap={4}>
            <Title order={3}>2. Install in Claude Code</Title>
            <Text c="dimmed" fw={500}>
              Add the Semble marketplace and install the plugin (recommended):
            </Text>
          </Stack>
          <CodeHighlight
            code={marketplaceInstallCode}
            language="bash"
            radius="md"
            copyLabel="Copy"
            copiedLabel="Copied!"
          />
          <Text c="dimmed" fw={500}>
            Or install directly from npm:
          </Text>
          <CodeHighlight
            code={npmInstallCode}
            language="bash"
            radius="md"
            copyLabel="Copy"
            copiedLabel="Copied!"
          />
          <Text c="dimmed" fw={500}>
            You'll be prompted for your API key when the plugin is enabled.
            Along with the tools, the plugin ships skills that Claude invokes
            automatically — getting started, deep research, and activity
            digests.
          </Text>
        </Stack>

        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={3}>Using Claude Desktop instead?</Title>
            <Text c="dimmed" fw={500}>
              Semble ships as a desktop extension, since Claude Desktop's
              custom connectors only support OAuth. Skills are a Claude Code
              feature and aren't available in Claude Desktop.
            </Text>
          </Stack>
          <Timeline active={3} bulletSize={36} lineWidth={3} color="green">
            <TimelineItem
              bullet={<MdOutlineFileDownload size={20} />}
              title="Download the extension"
            >
              <Text c="dimmed" fw={500}>
                Grab{' '}
                <Anchor
                  href="https://github.com/cosmik-network/semble-claude-plugin/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  c="blue"
                  inherit
                >
                  semble.mcpb from the latest release
                </Anchor>
                .
              </Text>
            </TimelineItem>
            <TimelineItem
              bullet={<MdOutlineExtension size={20} />}
              title="Open it"
            >
              <Text c="dimmed" fw={500}>
                Double-click the file — Claude Desktop opens an install dialog.
              </Text>
            </TimelineItem>
            <TimelineItem
              bullet={<MdOutlineKey size={20} />}
              title="Enter your API key"
            >
              <Text c="dimmed" fw={500}>
                Paste your Semble API key when prompted. It's stored in your OS
                keychain.
              </Text>
            </TimelineItem>
          </Timeline>
        </Stack>

        <Stack gap="md">
          <Stack gap={4}>
            <Title order={3}>What you can do</Title>
            <Text c="dimmed" fw={500}>
              Once installed, just ask. Claude picks the right tools and skills
              automatically, and confirms before any write — saving,
              connecting, following, or deleting.
            </Text>
          </Stack>
          <List spacing="sm" c="dimmed" fw={500}>
            {examplePrompts.map((prompt) => (
              <ListItem key={prompt}>
                <Text fs="italic" fw={500} c="dimmed">
                  {prompt}
                </Text>
              </ListItem>
            ))}
          </List>
        </Stack>

        <GuideFooter />
      </Stack>
    </Container>
  );
}
