import type { ConnectionWithSourceAndTarget } from '@semble/types';
import { Card, Group, Stack, Grid, Badge, ThemeIcon } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { IoArrowDown, IoArrowForward } from 'react-icons/io5';
import { CONNECTION_TYPES } from '../../const/connectionTypes';
import styles from './ConnectionCard.module.css';

interface Props {
  connection: ConnectionWithSourceAndTarget;
  withoutBorder?: boolean;
}

export default function ConnectionCard(props: Props) {
  const sourceUrlView = props.connection.source;
  const targetUrlView = props.connection.target;

  const content = (
    <Grid gap={'xs'} align="stretch">
      {/* Source URL */}
      <Grid.Col span={{ base: 12, sm: 4.75 }}>
        <UrlCard
          id={sourceUrlView.url}
          url={sourceUrlView.url}
          cardContent={sourceUrlView.metadata}
          urlLibraryCount={sourceUrlView.urlLibraryCount}
          urlIsInLibrary={sourceUrlView.urlInLibrary ?? false}
          urlConnectionCount={sourceUrlView.urlConnectionCount ?? 0}
        />
      </Grid.Col>

      {/* Connection Metadata */}
      <Grid.Col span={{ base: 12, sm: 2.5 }}>
        <Card p={0} radius={'md'} bg={'transparent'} h={'100%'}>
          <Group justify="center" wrap="nowrap" align="center" h={'100%'}>
            <Stack gap={0} align="center" justify="center">
              {props.connection.connection.type &&
                (() => {
                  const config = CONNECTION_TYPES.find(
                    (t) => t.value === props.connection.connection.type,
                  );
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <Stack align="center" gap={'xs'}>
                      <ThemeIcon
                        color="gray"
                        size={'sm'}
                        variant="light"
                        radius={'xl'}
                        hiddenFrom="sm"
                      >
                        <IoArrowDown />
                      </ThemeIcon>

                      <ThemeIcon
                        color="gray"
                        size={'sm'}
                        variant="light"
                        radius={'xl'}
                        visibleFrom="sm"
                      >
                        <IoArrowForward />
                      </ThemeIcon>

                      <Badge
                        size="md"
                        color="green"
                        variant="light"
                        leftSection={<Icon />}
                      >
                        {config.label}
                      </Badge>
                    </Stack>
                  );
                })()}
            </Stack>
          </Group>
        </Card>
      </Grid.Col>

      {/* Target URL */}
      <Grid.Col span={{ base: 12, sm: 4.75 }}>
        <UrlCard
          id={targetUrlView.url}
          url={targetUrlView.url}
          cardContent={targetUrlView.metadata}
          urlLibraryCount={targetUrlView.urlLibraryCount}
          urlIsInLibrary={targetUrlView.urlInLibrary ?? false}
          urlConnectionCount={targetUrlView.urlConnectionCount ?? 0}
        />
      </Grid.Col>
    </Grid>
  );

  if (props.withoutBorder) {
    return content;
  }

  return (
    <Card p={'xs'} radius={'lg'} className={styles.root} withBorder>
      {content}
    </Card>
  );
}
