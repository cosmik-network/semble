import {
  Box,
  Center,
  Container,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import { BiRightArrowAlt } from 'react-icons/bi';
import { LinkButton } from '@/components/link/MantineLink';
import HeaderSearchBar from '@/components/landing/headerSearchBar/HeaderSearchBar';

export default function NotFound() {
  return (
    <Center h={'100svh'} p={'md'}>
      <Container size={'sm'} my={'auto'}>
        <Stack align="center">
          <Stack gap={'xs'}>
            <Text fz={'h1'} fw={600} ta={'center'}>
              Page not found
            </Text>
            <Text fz={'lg'} fw={500} c={'dimmed'} ta={'center'} maw={300}>
              The page you&apos;re looking for doesn&apos;t exist or may have
              moved.
            </Text>
          </Stack>

          <Box w={'100%'} maw={420} mt={'md'}>
            <HeaderSearchBar />
          </Box>

          <Group justify="center" gap="xs" mt={'lg'}>
            <LinkButton href="/home">Go home</LinkButton>

            <LinkButton href="/explore" variant="light" color="gray">
              Explore
            </LinkButton>
          </Group>
        </Stack>
      </Container>
    </Center>
  );
}
