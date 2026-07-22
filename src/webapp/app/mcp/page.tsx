'use client';

import {
  Anchor,
  Box,
  Button,
  Card,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  TimelineItem,
  Title,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import {
  MdOutlineFileDownload,
  MdOutlineKey,
  MdOutlineBookmarkAdd,
  MdOutlineTravelExplore,
  MdOutlineNotificationsActive,
} from 'react-icons/md';
import { BiRightArrowAlt } from 'react-icons/bi';
import { FaNpm, FaGithub } from 'react-icons/fa6';
import { PiPlugsConnectedFill } from 'react-icons/pi';
import { TbHandClick } from 'react-icons/tb';
import ClaudeIcon from '@/assets/icons/claude-icon.svg';
import SembleLogo from '@/assets/semble-logo.svg';
import GuideFooter from '@/components/guides/GuideFooter';
import { LinkButton } from '@/components/link/MantineLink';

const marketplaceInstallCode = `/plugin marketplace add https://raw.githubusercontent.com/cosmik-network/semble-claude-plugin/main/marketplace/marketplace.json
/plugin install semble`;

const npmInstallCode = `/plugin install npm:@semble.so/claude-plugin`;

const useCases = [
  {
    title: 'Save & annotate',
    icon: (
      <MdOutlineBookmarkAdd size={28} color="var(--mantine-color-green-6)" />
    ),
    prompt:
      'Save this URL to my AI-safety collection and add a note on why it matters.',
  },
  {
    title: 'Deep research',
    icon: (
      <MdOutlineTravelExplore size={28} color="var(--mantine-color-green-6)" />
    ),
    prompt:
      'Research what Semble has on discourse graphs — papers, curators, collections.',
  },
  {
    title: 'Catch up',
    icon: (
      <MdOutlineNotificationsActive
        size={28}
        color="var(--mantine-color-green-6)"
      />
    ),
    prompt:
      'Catch me up on Semble — what happened across my network this past week?',
  },
  {
    title: 'Connect ideas',
    icon: (
      <PiPlugsConnectedFill size={28} color="var(--mantine-color-green-6)" />
    ),
    prompt:
      "Connect this paper to that one as SUPPORTS, and note why they're related.",
  },
];

export default function McpPage() {
  return (
    <Container size="xs" p="md" py="xl">
      <Stack gap="xl">
        <Stack align="center" gap="lg" pos="relative" py="md">
          {/* soft glow behind the hero, matching the landing page accents */}
          <Box
            pos="absolute"
            inset={0}
            style={{
              background:
                'radial-gradient(closest-side at 50% 40%, light-dark(#EFFFD8, rgba(30, 77, 217, 0.14)) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          <Group gap="md" style={{ position: 'relative' }}>
            <Image
              src={SembleLogo.src}
              alt="Semble"
              w="auto"
              h={44}
              fit="contain"
              style={{ transform: 'rotate(-6deg)' }}
            />
            <Text component="span" fz={26} lh={1} aria-hidden>
              🤝
            </Text>
            <Image
              src={ClaudeIcon.src}
              alt="Claude"
              w={44}
              h={44}
              fit="contain"
              style={{ transform: 'rotate(6deg)' }}
            />
          </Group>

          <Stack gap="xs" align="center" style={{ position: 'relative' }}>
            <Title order={1} fw={700} fz="2.4rem" ta="center">
              Semble for Claude
            </Title>

            {/* light mode subtitle */}
            <Text fw={600} fz="xl" c="#1F6144" ta="center" maw={420} darkHidden>
              Save links, build collections, and explore your knowledge network
              — right from your conversations
            </Text>

            {/* dark mode subtitle */}
            <Text
              fw={600}
              fz="xl"
              c="#1e4dd9"
              ta="center"
              maw={420}
              lightHidden
            >
              Save links, build collections, and explore your knowledge network
              — right from your conversations
            </Text>
          </Stack>

          <Group gap="xs" style={{ position: 'relative' }}>
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

          <Text
            c="dimmed"
            fw={500}
            ta="center"
            maw={420}
            style={{ position: 'relative' }}
          >
            The plugin gives Claude the full Semble toolkit — cards,
            collections, typed connections, feeds, semantic search, and your
            social graph.
          </Text>
        </Stack>

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
              bullet={<TbHandClick size={20} />}
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
              Once installed, just ask:
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
            {useCases.map((useCase) => (
              <Card
                key={useCase.title}
                bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
                radius="lg"
              >
                <Stack justify="space-between" h="100%" gap="md">
                  {useCase.icon}
                  <Stack gap="xs">
                    <Text fw={600} fz="lg">
                      {useCase.title}
                    </Text>
                    <Text c="dimmed" fs="italic">
                      “{useCase.prompt}”
                    </Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
          <Text fw={500} c="dimmed" ta="center" maw={420} mx="auto" mt="xs">
            Claude picks the right tools and skills automatically, and
            confirms before any write — saving, connecting, following, or
            deleting.
          </Text>
        </Stack>

        <GuideFooter />
      </Stack>
    </Container>
  );
}
