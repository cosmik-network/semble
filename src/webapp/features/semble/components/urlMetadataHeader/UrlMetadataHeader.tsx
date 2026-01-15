import { getUrlMetadata } from '@/features/cards/lib/dal';
import { getUrlTypeIcon } from '@/lib/utils/icon';
import { getDomain } from '@/lib/utils/link';
import {
  Stack,
  Tooltip,
  Anchor,
  Image,
  Title,
  Text,
  Spoiler,
  Card,
  Grid,
  GridCol,
  Group,
  Badge,
} from '@mantine/core';
import { UrlType } from '@semble/types';
import Link from 'next/link';
import { IconType } from 'react-icons/lib';
import { RiArrowRightUpLine } from 'react-icons/ri';

interface Props {
  url: string;
  children: React.ReactNode;
}

export default async function UrlMetadataHeader(props: Props) {
  const { metadata } = await getUrlMetadata(props.url);
  const urlTypeIcon = getUrlTypeIcon(metadata.type as UrlType);
  const IconComponent = urlTypeIcon as IconType;

  return (
    <Grid gutter={'lg'} justify="space-between">
      <GridCol span={{ base: 'auto' }}>
        <Stack>
          <Stack gap={0} align="start">
            <Group gap={'xs'}>
              <Badge size="xs" color="lime" leftSection={<IconComponent />}>
                {metadata.type}
              </Badge>
              <Tooltip label={metadata.url}>
                <Anchor
                  component={Link}
                  target="_blank"
                  fw={700}
                  c="blue"
                  href={props.url}
                  style={{ display: 'inline-block' }}
                >
                  <Group gap={0} align="center" wrap="nowrap">
                    {getDomain(props.url)}
                    <RiArrowRightUpLine />
                  </Group>
                </Anchor>
              </Tooltip>
            </Group>

            {metadata.title && (
              <Anchor
                component={Link}
                href={metadata.url}
                target="_blank"
                c={'inherit'}
                w={'fit-content'}
              >
                <Title order={1}>{metadata.title}</Title>
              </Anchor>
            )}
          </Stack>
          {metadata.description && (
            <Spoiler showLabel={'Read more'} hideLabel={'See less'}>
              <Text c="gray" fw={500} maw={650}>
                {metadata.description}
              </Text>
            </Spoiler>
          )}
        </Stack>
      </GridCol>
      <GridCol span={{ base: 12, sm: 'content' }}>
        <Stack gap={'sm'} align="center">
          {metadata.imageUrl && (
            <Card
              p={0}
              radius={'md'}
              component={Link}
              href={props.url}
              target="_blank"
              withBorder
            >
              <Image
                src={metadata.imageUrl}
                alt={`${props.url} social preview image`}
                mah={150}
                w={'auto'}
                maw={'100%'}
                fit="contain"
              />
            </Card>
          )}
          {props.children}
        </Stack>
      </GridCol>
    </Grid>
  );
}
