import {
  Box,
  Card,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import type { IconType } from 'react-icons';
import { TbArrowUpRight } from 'react-icons/tb';
import ClaudeIcon from '@/assets/icons/claude-icon.svg';
import {
  api,
  extension,
  mcp,
  plugins,
  type Integration,
  type IntegrationGroup,
} from './integrations';
import classes from './ExtendBento.module.css';

function BentoCard(props: {
  area: string;
  group: IntegrationGroup;
  children: React.ReactNode;
}) {
  return (
    <Card
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))"
      radius="lg"
      padding="sm"
      style={{ gridArea: props.area }}
    >
      <Stack gap="lg" h="100%">
        <Stack gap="xs">
          <ThemeIcon size={40} radius="md" variant="light" color="green">
            <props.group.Icon size={22} />
          </ThemeIcon>
          <Text fw={600} fz="lg" mt={4}>
            {props.group.title}
          </Text>
          <Text c="dimmed">{props.group.description}</Text>
        </Stack>
        {props.children}
      </Stack>
    </Card>
  );
}

function IntegrationTile(props: {
  integration: Integration;
  Icon: IconType;
  stacked?: boolean;
}) {
  const { integration } = props;
  const className = props.stacked
    ? `${classes.tile} ${classes.tileStack}`
    : classes.tile;

  const content = (
    <>
      <Box className={classes.logo}>
        {integration.logo ? (
          <Image src={integration.logo} alt="" w={20} h={20} fit="contain" />
        ) : (
          <props.Icon size={20} color="var(--mantine-color-green-6)" />
        )}
      </Box>
      <Box className={classes.tileText}>
        <Text fw={600} fz="sm" lh={1.3}>
          {integration.name}
        </Text>
        <Text c="dimmed" fz="xs" lh={1.3}>
          {integration.description}
        </Text>
      </Box>
    </>
  );

  if (!integration.href) {
    return (
      <div className={className} data-disabled>
        {content}
      </div>
    );
  }

  return (
    <a
      href={integration.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
      <TbArrowUpRight className={classes.arrow} size={16} aria-hidden />
    </a>
  );
}

// Tiles grow to fill whatever height the narrow card beside them sets
function TileGrid(props: { group: IntegrationGroup }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="xs" flex={1}>
      {props.group.integrations.map((integration) => (
        <IntegrationTile
          key={integration.name}
          integration={integration}
          Icon={props.group.Icon}
          stacked
        />
      ))}
    </SimpleGrid>
  );
}

function PreviewWithLink(props: {
  group: IntegrationGroup;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="xs" mt="auto">
      <Box className={classes.preview}>{props.children}</Box>
      <IntegrationTile
        integration={props.group.integrations[0]}
        Icon={props.group.Icon}
      />
    </Stack>
  );
}

export default function ExtendBento() {
  return (
    <Box className={classes.bento} maw={900} w="100%" mt="1rem">
      <BentoCard area="extension" group={extension}>
        <TileGrid group={extension} />
      </BentoCard>

      <BentoCard area="mcp" group={mcp}>
        <PreviewWithLink group={mcp}>
          {/* Illustrative exchange, not real data */}
          <Stack gap={8} p="sm" aria-hidden>
            <Text fz="sm" className={classes.bubble}>
              What&apos;s new in my network?
            </Text>
            <Group gap={6} wrap="nowrap">
              <Image src={ClaudeIcon.src} alt="" w={14} h={14} />
              <Text fz="sm" c="dimmed">
                12 new cards from 5 curators
              </Text>
            </Group>
          </Stack>
        </PreviewWithLink>
      </BentoCard>

      <BentoCard area="api" group={api}>
        <PreviewWithLink group={api}>
          <CodeHighlight
            code="npm install @semble.so/api"
            language="text"
            background="transparent"
            copyLabel="Copy"
            copiedLabel="Copied!"
          />
        </PreviewWithLink>
      </BentoCard>

      <BentoCard area="plugins" group={plugins}>
        <TileGrid group={plugins} />
      </BentoCard>
    </Box>
  );
}
