import { Group, TextInput, Button, Card } from '@mantine/core';
import { COSMIK_BLOG_PUBLICATION_URI } from '@/features/platforms/leaflet/lib/blog';

export default function EmailSubscribe() {
  return (
    <Card p={'8'} radius={'xl'} withBorder>
      <form action="https://leaflet.pub/api/subscribe_email" method="post">
        <Group gap={'xs'} wrap="nowrap">
          <input
            type="hidden"
            name="publication"
            value={COSMIK_BLOG_PUBLICATION_URI}
          />
          {/* miw={0} lets the field shrink past its intrinsic width, so the
              pill still fits a 320px viewport. */}
          <TextInput
            type="email"
            name="email"
            placeholder="your@email.com"
            required
            size="xs"
            radius={'xl'}
            variant="unstyled"
            mx={'5'}
            flex={1}
            miw={0}
            w={{ base: 200, xs: 270 }}
          />
          <Button type="submit" size="xs">
            Subscribe
          </Button>
        </Group>
      </form>
    </Card>
  );
}
