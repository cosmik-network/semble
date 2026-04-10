import { Container, Stack, Image, Anchor, Box, Badge } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { Metadata } from 'next';
import { LinkButton } from '@/components/link/MantineLink';

export const metadata: Metadata = {
  title: 'Privacy Policy — Semble',
  description: `Follow your peers' research trails. Surface and discover new connections. Built on ATProto so you own your data.`,
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Container p="md" size="sm">
      <Stack align="start">
        <Anchor href={'/'}>
          <Stack align="center" gap={'xs'}>
            <Image src={SembleLogo.src} alt="Semble logo" w={'auto'} h={50} />
            <Badge size="sm">Alpha</Badge>
          </Stack>
        </Anchor>

        <Stack>{props.children}</Stack>
        <Box component="footer" px={'md'} py={'xs'} mt={'xl'} mx={'auto'}>
          <LinkButton href="/" variant="light" color="dark.1" fw={600}>
            Back to home
          </LinkButton>
        </Box>
      </Stack>
    </Container>
  );
}
