import {
  Container,
  Stack,
  Group,
  Avatar,
  Text,
  Title,
  Button,
  Spoiler,
  Grid,
  GridCol,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { truncateText } from '@/lib/utils/text';
import MinimalProfileHeaderContainer from '../../containers/minimalProfileHeaderContainer/MinimalProfileHeaderContainer';
import { FaBluesky } from 'react-icons/fa6';
import { getProfile } from '../../lib/dal';
import { Fragment } from 'react';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';

interface Props {
  handle: string;
}

export default async function ProfileHeader(props: Props) {
  const profile = await getProfile(props.handle);

  return (
    <Fragment>
      <Container p={0} m={0} fluid>
        <MinimalProfileHeaderContainer
          avatarUrl={profile.avatarUrl}
          name={profile.name}
          handle={profile.handle}
        />
      </Container>
      <Container p={0} size={'xl'}>
        <Stack gap={'sm'} p={'xs'}>
          <Stack gap={'xl'}>
            <Grid gutter={'md'} align="start" grow>
              <GridCol span={'auto'}>
                <Avatar
                  src={profile.avatarUrl}
                  alt={`${profile.name}'s avatar`}
                  size={'clamp(90px, 22vw, 100px)'}
                  radius={'lg'}
                />
              </GridCol>

              <GridCol span={{ base: 12, xs: 10 }}>
                <Stack gap={'sm'}>
                  <Stack gap={0}>
                    <Title order={1} fz={'h2'} c={'bright'}>
                      {profile.name}
                    </Title>
                    <Group gap={'xs'}>
                      <Text c="gray" fw={600} fz={'lg'}>
                        @{profile.handle}
                      </Text>
                      <Tooltip label="View Bluesky Profile">
                        <ActionIcon
                          component="a"
                          href={`https://bsky.app/profile/${profile.handle}`}
                          target="_blank"
                          variant="light"
                          color="blue"
                          radius={'xl'}
                        >
                          <FaBluesky size={14} fill="#0085ff" />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Stack>
                  {profile.description && (
                    <Spoiler
                      showLabel={'Read more'}
                      hideLabel={'See less'}
                      maxHeight={75}
                      maw={700}
                    >
                      <RichTextRenderer text={profile.description} />
                    </Spoiler>
                  )}
                </Stack>
              </GridCol>
            </Grid>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  );
}
