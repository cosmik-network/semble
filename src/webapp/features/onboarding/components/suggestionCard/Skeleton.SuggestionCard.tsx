import { Card, Group, Skeleton, Stack } from '@mantine/core';

/** A placeholder bar sitting in a box the height of the text line it stands
 * in for, so the card doesn't resize once the real content lands. */
function TextLine(props: { size: 'md' | 'sm'; w: string }) {
  return (
    <Group
      h={`calc(var(--mantine-font-size-${props.size}) * var(--mantine-line-height-${props.size}))`}
      align="center"
      gap={0}
    >
      <Skeleton h={props.size === 'md' ? 12 : 10} w={props.w} />
    </Group>
  );
}

export default function SuggestionCardSkeleton() {
  return (
    <Card withBorder radius={'lg'} p={'md'} h={'100%'}>
      <Group wrap="nowrap" align="center" gap={'sm'}>
        {/* LinkAvatar size="md", with the theme's default `md` radius. */}
        <Skeleton h={38} w={38} radius={'md'} />

        <Stack gap={0} miw={0} flex={1}>
          {/* Name, then handle. */}
          <TextLine size="md" w={'70%'} />
          <TextLine size="md" w={'45%'} />
        </Stack>

        {/* FollowButton size="xs" */}
        <Skeleton h={30} w={72} radius={'xl'} style={{ flex: '0 0 auto' }} />
      </Group>

      {/* Description: `sm` text, clamped to two lines. */}
      <Stack gap={0} mt={'sm'}>
        <TextLine size="sm" w={'100%'} />
        <TextLine size="sm" w={'80%'} />
      </Stack>
    </Card>
  );
}
