import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Paper,
  ThemeIcon,
  Timeline,
  TimelineItem,
} from '@mantine/core';
import { TbStackForward } from 'react-icons/tb';
import {
  MdAddCircleOutline,
  MdOutlineIosShare,
  MdOpenInNew,
} from 'react-icons/md';
import GuideHeader from '@/components/guides/GuideHeader';
import GuideFooter from '@/components/guides/GuideFooter';

export default function IosShortcutPage() {
  return (
    <Container size="xs" p="md" py="xl">
      <Stack gap="xl">
        <GuideHeader
          title="Semble iOS Shortcut"
          subtitle="Save any webpage to Semble straight from the share sheet on your iPhone or iPad."
        />

        <Paper radius="lg" p="xl" bg="var(--mantine-color-default-hover)">
          <Stack align="center" gap="lg">
            <ThemeIcon
              size={72}
              radius="lg"
              variant="white"
              c="tangerine"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <TbStackForward size={36} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Title order={3} ta="center">
                Get the shortcut
              </Title>
              <Text c="dimmed" fw={500} ta="center" maw={340}>
                Open this page on your iPhone or iPad, then tap the button
                below.
              </Text>
            </Stack>
            <Button
              component="a"
              href={
                'https://www.icloud.com/shortcuts/9c4b4b4bc4ef4d6d93513c59373b0af6'
              }
              target="_blank"
              size="lg"
              leftSection={<TbStackForward size={22} />}
            >
              Add Semble shortcut
            </Button>
          </Stack>
        </Paper>

        <Stack gap="lg">
          <Title order={3}>How it works</Title>
          <Timeline active={3} bulletSize={36} lineWidth={3} color="green">
            <TimelineItem
              bullet={<MdAddCircleOutline size={20} />}
              title="Add the shortcut"
            >
              <Text c="dimmed" fw={500}>
                Tap the button above and choose &quot;Add Shortcut&quot; in the
                Shortcuts app.
              </Text>
            </TimelineItem>
            <TimelineItem
              bullet={<MdOutlineIosShare size={20} />}
              title="Open the share sheet"
            >
              <Text c="dimmed" fw={500}>
                When you find a webpage worth saving, tap the Share button in
                Safari or any other app.
              </Text>
            </TimelineItem>
            <TimelineItem
              bullet={<MdOpenInNew size={20} />}
              title="Open it in Semble"
            >
              <Text c="dimmed" fw={500}>
                Pick the Semble shortcut from the share sheet and the page opens
                in Semble, ready to add to your library.
              </Text>
            </TimelineItem>
          </Timeline>
        </Stack>

        <GuideFooter />
      </Stack>
    </Container>
  );
}
