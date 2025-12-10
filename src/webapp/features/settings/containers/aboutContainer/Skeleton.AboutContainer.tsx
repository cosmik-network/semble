import {
  ButtonGroup,
  Card,
  Container,
  Stack,
  Image,
  Text,
  Group,
} from '@mantine/core';
import CosmikLogo from '@/assets/cosmik-logo-full.svg';
import CosmikBanner from '@/assets/cosmik-bg-banner-small.webp';
import SettingItemSkeleton from '../../components/settingItem/Skeleton.SettingItem';

export default function AboutContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <ButtonGroup orientation="vertical">
          <SettingItemSkeleton />
          <SettingItemSkeleton />
        </ButtonGroup>
        <Card
          component="a"
          href="https://cosmik.network/"
          target="_blank"
          p="sm"
          radius="lg"
          withBorder
          style={{
            backgroundImage: `url(${CosmikBanner.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Group
            gap="md"
            wrap="nowrap"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Stack gap="xs">
              <Image src={CosmikLogo.src} alt="Cosmik logo" w={92} h={28.4} />
              <Text fw={500} c={'dark'}>
                Semble is lovingly built by the team at Cosmik Network
              </Text>
            </Stack>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
