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
                    <Text c="gray" fw={600} fz={'lg'}>
                      @{profile.handle}
                    </Text>
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
          <Group>
            <Button
              component="a"
              href={`https://bsky.app/profile/${profile.handle}`}
              target="_blank"
              variant="light"
              size="xs"
              radius={'xl'}
              color={'gray'}
              leftSection={<FaBluesky />}
            >
              {truncateText(profile.handle, 14)}
            </Button>
          </Group>
        </Stack>
      </Container>
    </Fragment>
  );
}
