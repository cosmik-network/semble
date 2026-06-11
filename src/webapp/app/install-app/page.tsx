'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  Badge,
  Group,
  Card,
  CardSection,
  Paper,
  ThemeIcon,
  Timeline,
  TimelineItem,
} from '@mantine/core';
import { useOs } from '@mantine/hooks';
import type { IconType } from 'react-icons/lib';
import { FaApple, FaAndroid } from 'react-icons/fa6';
import { MdOutlineComputer } from 'react-icons/md';
import GuideHeader from '@/components/guides/GuideHeader';
import GuideFooter from '@/components/guides/GuideFooter';

type Platform = 'ios' | 'android' | 'desktop';

interface Step {
  title: string;
  text: string;
}

interface PlatformGuide {
  platform: Platform;
  icon: IconType;
  title: string;
  browser: string;
  steps: Step[];
}

const guides: PlatformGuide[] = [
  {
    platform: 'ios',
    icon: FaApple,
    title: 'iPhone & iPad',
    browser: 'Safari',
    steps: [
      {
        title: 'Tap the Share button',
        text: 'Open Semble in Safari and tap Share in the toolbar.',
      },
      {
        title: 'Add to Home Screen',
        text: 'Scroll down and tap "Add to Home Screen".',
      },
      {
        title: 'Tap Add',
        text: 'Semble will appear on your home screen like any app.',
      },
    ],
  },
  {
    platform: 'android',
    icon: FaAndroid,
    title: 'Android',
    browser: 'Chrome',
    steps: [
      {
        title: 'Open the Chrome menu',
        text: 'Open Semble in Chrome and tap the ⋮ menu.',
      },
      {
        title: 'Add to Home screen',
        text: 'Tap "Add to Home screen", then choose "Install".',
      },
    ],
  },
  {
    platform: 'desktop',
    icon: MdOutlineComputer,
    title: 'Desktop',
    browser: 'Chrome & Edge',
    steps: [
      {
        title: 'Click the install icon',
        text: 'Open Semble and click the install icon in the address bar.',
      },
      {
        title: 'Click Install',
        text: 'Semble opens in its own window.',
      },
    ],
  },
];

function StepList(props: { steps: Step[] }) {
  return (
    <Timeline
      active={props.steps.length}
      bulletSize={36}
      lineWidth={3}
      color="green"
    >
      {props.steps.map((step, index) => (
        <TimelineItem
          key={index}
          bullet={
            <Text fw={700} size="sm">
              {index + 1}
            </Text>
          }
          title={step.title}
        >
          <Text c="dimmed" fw={500}>
            {step.text}
          </Text>
        </TimelineItem>
      ))}
    </Timeline>
  );
}

function HeroPlatformCard(props: { guide: PlatformGuide }) {
  const { guide } = props;

  return (
    <Paper radius="lg" p="xl" bg="var(--mantine-color-default-hover)">
      <Stack gap="lg">
        <Stack align="center" gap="md">
          <ThemeIcon
            size={72}
            radius="lg"
            variant="white"
            c="tangerine"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <guide.icon size={36} />
          </ThemeIcon>
          <Stack gap={4} align="center">
            <Title order={3} ta="center">
              Install on {guide.title}
            </Title>
            <Text c="dimmed" fw={500}>
              {guide.browser}
            </Text>
            <Badge variant="light" size="sm">
              Your device
            </Badge>
          </Stack>
        </Stack>
        <StepList steps={guide.steps} />
      </Stack>
    </Paper>
  );
}

function PlatformCard(props: { guide: PlatformGuide }) {
  const { guide } = props;

  return (
    <Card radius="lg" padding="lg" withBorder>
      <CardSection
        px="lg"
        py="md"
        withBorder
        bg="var(--mantine-color-default-hover)"
      >
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={44}
            radius="md"
            variant="white"
            c="tangerine"
            style={{
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <guide.icon size={24} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3} size="h4">
              {guide.title}
            </Title>
            <Text c="dimmed" fw={500} size="sm">
              {guide.browser}
            </Text>
          </Stack>
        </Group>
      </CardSection>

      <Stack mt="md">
        <StepList steps={guide.steps} />
      </Stack>
    </Card>
  );
}

export default function InstallAppPage() {
  const os = useOs();

  const currentPlatform: Platform | null =
    os === 'ios'
      ? 'ios'
      : os === 'android'
        ? 'android'
        : os === 'macos' || os === 'windows' || os === 'linux'
          ? 'desktop'
          : null;

  const heroGuide = currentPlatform
    ? guides.find((g) => g.platform === currentPlatform)
    : undefined;
  const otherGuides = guides.filter((g) => g.platform !== currentPlatform);

  return (
    <Container size="xs" p="md" py="xl">
      <Stack gap="xl">
        <GuideHeader
          title="Install the Semble App"
          subtitle="Semble is a progressive web app (PWA) — install it straight from your browser, no app store needed."
        />

        {heroGuide && <HeroPlatformCard guide={heroGuide} />}

        <Stack gap="lg">
          <Title order={3}>{heroGuide ? 'Other devices' : 'All devices'}</Title>
          <Stack gap="md">
            {otherGuides.map((guide) => (
              <PlatformCard key={guide.platform} guide={guide} />
            ))}
          </Stack>
        </Stack>

        <GuideFooter />
      </Stack>
    </Container>
  );
}
