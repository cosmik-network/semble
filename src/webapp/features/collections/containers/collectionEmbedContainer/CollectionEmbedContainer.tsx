import {
  Anchor,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Avatar,
  Grid,
  GridCol,
  Image,
  Button,
  Card,
} from '@mantine/core';
import SembleLogo from '@/assets/semble-logo.svg';
import Link from 'next/link';
import { getCollectionPageByAtUri } from '../../lib/dal';
import { RiArrowRightUpLine } from 'react-icons/ri';
import UrlCardContent from '@/features/cards/components/urlCardContent/UrlCardContent';
import { isCollectionPage } from '@/lib/utils/link';

interface Props {
  rkey: string;
  handle: string;
}

export default async function CollectionEmbedContainer(props: Props) {
  const data = await getCollectionPageByAtUri({
    recordKey: props.rkey,
    handle: props.handle,
    params: {
      limit: 16,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

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
                {data.name}
              </Title>
              {data.description && (
                <Text c="gray" mt="lg">
                  {data.description}
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
                href={`/profile/${data.author.handle}`}
                target="_blank"
                src={data.author.avatarUrl}
                alt={`${data.author.name}'s' avatar`}
              />
              <Anchor
                component={Link}
                href={`/profile/${data.author.handle}`}
                target="_blank"
                fw={600}
                c="bright"
              >
                {data.author.name}
              </Anchor>
            </Group>
          </Group>
        </Group>

        <Grid gutter="md">
          {data.urlCards.map((card) => (
            <GridCol
              key={card.id}
              span={{
                base: 12,
                xs: 6,
                sm: 4,
                lg: 3,
              }}
            >
              <Anchor
                component={Link}
                href={`${isCollectionPage(card.url) ? card.url : `/url?id=${card.cardContent.url}`}`}
                target="_blank"
                underline="never"
              >
                <Card
                  component="article"
                  radius={'lg'}
                  p={'sm'}
                  flex={1}
                  h={'100%'}
                  withBorder
                  style={{ cursor: 'pointer' }}
                >
                  <Stack justify="space-between" gap={'sm'} flex={1}>
                    <UrlCardContent
                      url={card.url}
                      cardContent={card.cardContent}
                    />
                  </Stack>
                </Card>
              </Anchor>
            </GridCol>
          ))}
        </Grid>

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
            View more on Semble
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
