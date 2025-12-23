import SignUpForm from '@/features/auth/components/signUpForm/SignUpForm';
import { Stack, Title, Text, Anchor, Image, Badge } from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await verifySessionOnServer();
  if (session) redirect('/home');

  return (
    <Stack align="center" gap="xl" maw={450}>
      <Stack gap={0}>
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
            Welcome
          </Title>
        </Stack>
        <Text fz={'h3'} fw={700} ta={'center'} c={'stone'}>
          Sign up to get started
        </Text>
      </Stack>

      <Text fw={500} ta="center" maw={380}>
        If you have a Bluesky account, you can sign in with it; no new account
        is needed. In future, your account will be seamlessly migrated to the{' '}
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
      <SignUpForm />
    </Stack>
  );
}
