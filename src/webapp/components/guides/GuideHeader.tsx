import { Stack, Title, Text, Image, Badge, Anchor } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';

interface Props {
  title: string;
  subtitle: string;
}

export default function GuideHeader(props: Props) {
  return (
    <Stack gap="lg" align="center">
      <Anchor href={'/'}>
        <Stack align="center" gap={'xs'}>
          <Image
            src={SembleLogo.src}
            alt="Semble logo"
            w={48}
            h={64.5}
            mx={'auto'}
          />
          <Badge size="sm">Alpha</Badge>
        </Stack>
      </Anchor>
      <Stack gap={'xs'} align="center">
        <Title order={1} ta="center">
          {props.title}
        </Title>
        <Text c="dimmed" fz="xl" fw={600} maw={500} ta="center">
          {props.subtitle}
        </Text>
      </Stack>
    </Stack>
  );
}
