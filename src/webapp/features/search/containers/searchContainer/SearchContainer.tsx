import {
  BackgroundImage,
  Box,
  Button,
  Center,
  Container,
  Group,
  Stack,
  Title,
} from '@mantine/core';
import SearchBar from '../../components/searchBar/SearchBar';
import Link from 'next/link';
import { MdOutlineEmojiNature } from 'react-icons/md';
import { BiCollection } from 'react-icons/bi';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';
import { Fragment } from 'react';

function Content() {
  return (
    <Container p="xs" size="xl">
      <Center h={'75svh'}>
        <Stack align="center" maw={600} w={'100%'}>
          <Title order={2} ta={'center'}>
            Let's find something great
          </Title>
          <SearchBar />

          <Group gap={'xs'} justify="center">
            <Button
              component={Link}
              href={'explore'}
              variant="light"
              color="blue"
              leftSection={<MdOutlineEmojiNature size={18} />}
            >
              Explore
            </Button>
            <Button
              component={Link}
              href="/explore/gems-of-2025/collections"
              size="sm"
              variant="light"
              color={'grape'}
              leftSection={<BiCollection size={18} />}
            >
              Gem Collections
            </Button>
          </Group>
        </Stack>
      </Center>
    </Container>
  );
}

export default function SearchContainer() {
  const fadeStyle = {
    inset: 0,
    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 35%)',
    maskImage: 'linear-gradient(to top, transparent 0%, black 35%)',
    zIndex: 0,
  };

  return (
    <Box component="section" pos="relative" h="100svh" w="100%">
      {/* light mode bg */}
      <BackgroundImage
        src={BG.src}
        darkHidden
        pos={'absolute'}
        style={fadeStyle}
      />

      {/* dark mode bg */}
      <BackgroundImage
        src={DarkBG.src}
        lightHidden
        pos={'absolute'}
        style={fadeStyle}
      />

      {/* content positioned relative and higher z-index to stay sharp */}
      <Box pos="relative" style={{ zIndex: 1 }}>
        <Content />
      </Box>
    </Box>
  );
}
