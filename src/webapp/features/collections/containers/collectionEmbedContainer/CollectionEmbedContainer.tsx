'use client';

import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Grid,
  Image,
  Button,
  Card,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import { RiArrowRightUpLine } from 'react-icons/ri';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage, isProfilePage } from '@/lib/utils/link';
import useCollection from '../../lib/queries/useCollection';
import { Fragment } from 'react';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { useRouter } from 'next/navigation';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionEmbedContainer(props: Props) {
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCollection({
      rkey: props.rkey,
      handle: props.handle,
    });

  const firstPage = data.pages[0];
  const allCards = data.pages.flatMap((page) => page.urlCards ?? []);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';
  const router = useRouter();

  return (
    <Container p="xs" fluid>
      <Stack justify="flex-start">
        <Group justify="space-between" align="start">
          <Stack gap={'xs'} align="flex-start">
            <Anchor component={Link} href={appUrl} target="_blank">
              <Image src={SembleLogo.src} alt="Semble logo" w={'auto'} h={30} />
            </Anchor>
            <Stack gap={0}>
              <Text fw={700} c="grape">
                Collection
              </Text>
              <Title order={1} fz={'xl'}>
                {firstPage.name}
              </Title>
              {firstPage.description && (
                <Text c="gray" mt="lg">
                  {firstPage.description}
                </Text>
              )}
            </Stack>
          </Stack>

          <Group gap={'xs'}>
            <Text fw={600} c="gray">
              By
            </Text>
            <Group gap={5}>
              <Avatar
                size={'sm'}
                component={Link}
                href={`/profile/${firstPage.author.handle}`}
                target="_blank"
                src={firstPage.author.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${firstPage.author.name}'s avatar`}
              />
              <Anchor
                component={Link}
                href={`/profile/${firstPage.author.handle}`}
                target="_blank"
                fw={600}
                c="bright"
              >
                {firstPage.author.name}
              </Anchor>
            </Group>
          </Group>
        </Group>

        <Fragment>
          {allCards.length > 0 ? (
            <InfiniteScroll
              dataLength={allCards.length}
              hasMore={!!hasNextPage}
              isInitialLoading={isPending}
              isLoading={isFetchingNextPage}
              loadMore={fetchNextPage}
            >
              <Grid gutter="xs">
                {allCards.map((card) => (
                  <Grid.Col
                    key={card.id}
                    span={{
                      base: 12,
                      xs: 6,
                      sm: 4,
                      lg: 3,
                    }}
                  >
                    <Card
                      component="article"
                      radius={'lg'}
                      p={'sm'}
                      flex={1}
                      h={'100%'}
                      withBorder
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();

                        if (
                          isCollectionPage(card.url) ||
                          isProfilePage(card.url)
                        ) {
                          router.push(card.url);
                          return;
                        }

                        router.push(`/url?id=${card.cardContent.url}`);
                      }}
                    >
                      <Stack justify="space-between" gap={'sm'} flex={1}>
                        <UrlCardContent
                          url={card.url}
                          uri={card.uri}
                          cardContent={card.cardContent}
                        />
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </InfiniteScroll>
          ) : (
            <Stack align="center" gap="xs">
              <Text fz="h3" fw={600} c="gray">
                No cards
              </Text>
            </Stack>
          )}
        </Fragment>

        <Stack align="center" mt={'md'}>
          <Button
            component={Link}
            href={`${appUrl}/profile/${props.handle}/collections/${props.rkey}`}
            target="_blank"
            variant="light"
            color="grape"
            rightSection={<RiArrowRightUpLine />}
            size="md"
          >
            View on Semble
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
