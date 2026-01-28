import { getDomain } from '@/lib/utils/link';
import { Anchor, Text, Card, Stack, Tooltip } from '@mantine/core';
import { UrlCard } from '@semble/types';
import Link from 'next/link';
import { Fragment } from 'react';

interface Props {
  url: string;
  cardContent: UrlCard['cardContent'];
}

export default function SpotifyEmbed(props: Props) {
  const domain = getDomain(props.url);

  return (
    <Fragment>
      <Stack gap={0} flex={1}>
        <Tooltip label={props.cardContent.url}>
          <Anchor
            onClick={(e) => e.stopPropagation()}
            component={Link}
            href={props.cardContent.url}
            target="_blank"
            c={'gray'}
            lineClamp={1}
            w={'fit-content'}
          >
            {domain}
          </Anchor>
        </Tooltip>
        {props.cardContent.title && (
          <Text c={'bright'} lineClamp={2} fw={500}>
            {props.cardContent.title}
          </Text>
        )}
      </Stack>

      <Card p={0}>
        <iframe
          src={props.url}
          height={200}
          allowFullScreen
          style={{ border: 0 }}
        />
      </Card>
    </Fragment>
  );
}
