'use client';

import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import useMyCards from '@/features/cards/lib/queries/useMyCards';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { useNavbarContext } from '@/providers/navbar';
import {
  Anchor,
  Button,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Fragment, useState } from 'react';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { FiPlus } from 'react-icons/fi';
import { LinkButton } from '@/components/link/MantineLink';

export default function RecentCards() {
  const { desktopOpened } = useNavbarContext();
  const { settings } = useUserSettings();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const { data: profile } = useMyProfile();
  const { data: myCardsData } = useMyCards({ limit: 4 });
  const cards = myCardsData.pages.flatMap((page) => page.cards) ?? [];

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <FaRegNoteSticky size={22} />
          <Title order={2}>Cards</Title>
        </Group>
        <LinkButton
          variant="light"
          color="blue"
          href={`/profile/${profile.handle}/cards`}
        >
          View all
        </LinkButton>
      </Group>

      {cards.length > 0 ? (
        <Grid gutter={settings.cardView === 'list' ? 0 : 'xs'}>
          {cards.map((card, index) => (
            <Fragment key={card.id}>
              {settings.cardView === 'list' && index > 0 && (
                <Grid.Col span={12}>
                  <Divider />
                </Grid.Col>
              )}
              <Grid.Col
                span={{
                  base: 12,
                  xs:
                    settings.cardView !== 'grid' ? 12 : desktopOpened ? 12 : 6,
                  sm: settings.cardView !== 'grid' ? 12 : desktopOpened ? 6 : 4,
                  md: settings.cardView !== 'grid' ? 12 : 4,
                  lg: settings.cardView !== 'grid' ? 12 : 3,
                }}
              >
                <UrlCard
                  id={card.id}
                  url={card.url}
                  uri={card.uri}
                  cardContent={card.cardContent}
                  note={card.note}
                  urlLibraryCount={card.urlLibraryCount}
                  urlIsInLibrary={card.urlInLibrary}
                  urlConnectionCount={card.urlConnectionCount ?? 0}
                  cardAuthor={card.author}
                  viaCardId={card.id}
                />
              </Grid.Col>
            </Fragment>
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
              <Anchor href={'/explore'} fw={500} c={'grape'}>
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
