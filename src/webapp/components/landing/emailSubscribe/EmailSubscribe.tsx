import { Group, TextInput, Button, Card } from '@mantine/core';
import { COSMIK_BLOG_PUBLICATION_URI } from '@/features/platforms/leaflet/lib/blog';
import styles from './EmailSubscribe.module.css';

export default function EmailSubscribe() {
  // 3px so the pill hugs the Subscribe button — same reasoning as the hero's
  // Sign up pill, where more padding on the control's side read chunky.
  // w/maw instead of a fixed input width: the pill fills whatever gutter its
  // parent leaves (so it can never overflow a narrow viewport) and caps at
  // 320px.
  return (
    <Card pr={3} py={0} pl="xs" radius="xl" w="100%" withBorder maw={320}>
      <form action="https://leaflet.pub/api/subscribe_email" method="post">
        <Group gap={4} wrap="nowrap">
          <input
            type="hidden"
            name="publication"
            value={COSMIK_BLOG_PUBLICATION_URI}
          />
          {/* size="xs" shrinks height + padding but would also drag the font
              down to 12px, so the CSS module pins it: 14px on desktop, 16px on
              touch devices, where anything smaller makes iOS Safari zoom the
              page on focus. */}
          {/* miw={0} overrides the flex-item min-width:auto floor (~an input's
              20-char intrinsic width) so the field, not the pill, is what
              shrinks on narrow screens. */}
          <TextInput
            type="email"
            name="email"
            placeholder="your@email.com"
            required
            size="xs"
            radius={'sm'}
            variant="unstyled"
            mx={6}
            flex={1}
            miw={0}
            classNames={{ input: styles.input }}
          />
          <Button type="submit" size="xs" flex="0 0 auto">
            Subscribe
          </Button>
        </Group>
      </form>
    </Card>
  );
}
