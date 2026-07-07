import { Group, TextInput, Button, Card } from '@mantine/core';

const PUBLICATION_ID =
  'at://did:plc:b2p6rujcgpenbtcjposmjuc3/site.standard.publication/3m3axfv5hms24';

export default function EmailSubscribe() {
  return (
    <Card p={'8'} radius={'xl'} withBorder>
      <form action="https://leaflet.pub/api/subscribe_email" method="post">
        <Group gap={'xs'} wrap="nowrap">
          <input type="hidden" name="publication" value={PUBLICATION_ID} />
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
            w={{ base: 180, xs: 270 }}
          />
          <Button type="submit" size="xs" style={{ flexShrink: 0 }}>
            Get updates
          </Button>
        </Group>
      </form>
    </Card>
  );
}
