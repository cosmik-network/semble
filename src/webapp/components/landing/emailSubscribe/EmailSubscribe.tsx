import { Group, TextInput, Button, Card } from '@mantine/core';
import { COSMIK_BLOG_PUBLICATION_URI } from '@/features/platforms/leaflet/lib/blog';

export default function EmailSubscribe() {
  return (
    <form action="https://leaflet.pub/api/subscribe_email" method="post">
      <Card p={'xxs'} radius={'xl'} withBorder>
        <Group gap={'xs'} wrap="nowrap">
          <input
            type="hidden"
            name="publication"
            value={COSMIK_BLOG_PUBLICATION_URI}
          />
          {/* miw={0} lets the field shrink past its intrinsic width, so the
              pill still fits a 320px viewport. */}
          <TextInput
            aria-label="Email address"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            radius={'xl'}
            variant="unstyled"
            mx={'xs'}
            flex={1}
            miw={0}
          />
          <Button type="submit" variant="inverse">
            Subscribe
          </Button>
        </Group>
      </Card>
    </form>
  );
}
