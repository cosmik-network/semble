"use client";

import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import useMyCards from '@/features/cards/lib/queries/useMyCards';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { useNavbarContext } from '@/providers/navbar';
import { Anchor, Button, Grid, Group, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { FiPlus } from 'react-icons/fi';

export default function RecentCards() {
  const { desktopOpened } = useNavbarContext();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const { data: profile } = useMyProfile();
  const { data: myCardsData } = useMyCards({ limit: 8 });
  const cards = myCardsData.pages.flatMap((page) => page.cards) ?? [];

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <FaRegNoteSticky size={22} />
          <Title order={2}>Cards</Title>
        </Group>
        <Button
          variant="light"
          component={Link}
          color="blue"
          href={`/profile/${profile.handle}/cards`}
        >
          View all
        </Button>
      </Group>

      {cards.length > 0 ? (
        <Grid gutter="md">
          {cards.map((card) => (
            <Grid.Col
              key={card.id}
              span={{
                base: 12,
                xs: desktopOpened ? 12 : 6,
                sm: desktopOpened ? 6 : 4,
                md: 4,
                lg: 3,
              }}
            >
              <UrlCard
                id={card.id}
                url={card.url}
                cardContent={card.cardContent}
                note={card.note}
                urlLibraryCount={card.urlLibraryCount}
                urlIsInLibrary={card.urlInLibrary}
                cardAuthor={card.author}
              />
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Fragment>
          <Stack align="center" gap="xs">
            <Text fz="h3" fw={600} c="gray">
              No cards
            </Text>
            <Button
              variant="light"
              color="gray"
              size="md"
              rightSection={<FiPlus size={22} />}
              onClick={() => setShowAddDrawer(true)}
            >
              Add your first card
            </Button>

            <Text ta={'center'} fw={500} c={'gray'}>
              Need inspiration?{' '}
              <Anchor component={Link} href={'/explore'} fw={500} c={'grape'}>
                Explore cards from the community
              </Anchor>
            </Text>
          </Stack>

          <AddCardDrawer
            isOpen={showAddDrawer}
            onClose={() => setShowAddDrawer(false)}
          />
        </Fragment>
      )}
    </Stack>
  );
}
