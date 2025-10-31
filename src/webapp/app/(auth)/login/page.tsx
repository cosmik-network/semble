'use client';

import LoginForm from '@/features/auth/components/loginForm/LoginForm';
import {
  Stack,
  Title,
  Text,
  Image,
  Anchor,
  Popover,
  Button,
  PopoverTarget,
  PopoverDropdown,
  Loader,
  Badge,
} from '@mantine/core';
import { Suspense, useEffect } from 'react';
import { IoMdHelpCircleOutline } from 'react-icons/io';
import SembleLogo from '@/assets/semble-logo.svg';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function InnerPage() {
  const { isAuthenticated, isLoading, refreshAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExtensionLogin = searchParams.get('extension-login') === 'true';

  useEffect(() => {
    if (isAuthenticated && !isExtensionLogin) {
      refreshAuth();
      router.push('/home');
    }
  }, [isAuthenticated, router, isExtensionLogin, refreshAuth]);

  if (isAuthenticated) {
    return (
      <Stack align="center">
        <Loader type="dots" />
      </Stack>
    );
  }

  return (
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
        <LoginForm />
        <Stack align="center" gap={0}>
          <Text fw={500} c={'stone'}>
            {"Don't have an account? "}
            <Anchor href="/signup" fw={500}>
              Sign up
            </Anchor>
          </Text>
          <Popover withArrow shadow="sm">
            <PopoverTarget>
              <Button
                variant="white"
                size="md"
                fw={500}
                fs={'italic'}
                c={'stone'}
                rightSection={<IoMdHelpCircleOutline size={22} />}
              >
                How your Cosmik Network account works
              </Button>
            </PopoverTarget>
            <PopoverDropdown>
              <Text fw={500} ta="center" maw={380}>
                When you sign up today, you’ll create a Bluesky account. In near
                future, your account will be seamlessly migrated to our{' '}
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
        </Stack>
      </Stack>
      <Text fw={500} ta={'center'} c={'dark.1'}>
        By continuing, you agree to our{' '}
        <Anchor component={Link} href={'/privacy-policy'} c="dark.2" fw={600}>
          Privacy Policy
        </Anchor>
      </Text>
    </Stack>
  );
}

export default function Page() {
  return (
    <Suspense>
      <InnerPage />
    </Suspense>
  );
}
