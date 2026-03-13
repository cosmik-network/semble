import {
  Center,
  Container,
  Stack,
  Image,
  Badge,
  Title,
  Text,
  Popover,
  Anchor,
  PopoverTarget,
  Button,
  PopoverDropdown,
} from '@mantine/core';
import { Metadata } from 'next';
import Link from 'next/link';
import { IoMdHelpCircleOutline } from 'react-icons/io';
import SembleLogo from '@/assets/semble-logo.svg';

export const metadata: Metadata = {
  title: 'Log in — Semble',
  description: 'Welcome back',
};

interface Props {
  children: React.ReactNode;
}

export default async function Layout(props: Props) {
  return (
    <Container>
      <Center h={'100svh'} p={'sm'}>
        <Stack gap={'xl'} align="center">
          <Stack gap="xl" maw={300}>
            <Stack gap={'xs'}>
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
              <Title order={1} ta="center">
                Welcome back
              </Title>
            </Stack>
            {props.children}
          </Stack>
          <Stack gap={0}>
            <Popover withArrow shadow="sm">
              <PopoverTarget>
                <Button
                  variant="transparent"
                  fw={500}
                  fs={'italic'}
                  c={'dark.1'}
                  rightSection={<IoMdHelpCircleOutline size={22} />}
                >
                  How your Cosmik Network account works
                </Button>
              </PopoverTarget>
              <PopoverDropdown>
                <Text fw={500} ta="center" maw={380}>
                  If you have a Bluesky account, you can sign in with it; no new
                  account is needed. In future, you will have the option to
                  migrate your account to the{' '}
                  <Anchor
                    href="https://cosmik.network"
                    target="_blank"
                    fw={500}
                    c={'blue'}
                  >
                    Cosmik Network
                  </Anchor>
                  .
                </Text>
              </PopoverDropdown>
            </Popover>
            <Text fw={500} fz={'sm'} ta={'center'} c={'dark.1'}>
              By continuing, you agree to our{' '}
              <Anchor
                component={Link}
                href={'/privacy-policy'}
                c="dark.1"
                fw={600}
                fz={'sm'}
                underline="always"
              >
                Privacy Policy
              </Anchor>
            </Text>
          </Stack>
        </Stack>
      </Center>
    </Container>
  );
}
