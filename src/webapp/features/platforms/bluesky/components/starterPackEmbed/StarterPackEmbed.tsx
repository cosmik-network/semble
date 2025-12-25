import { AppBskyGraphDefs, AppBskyGraphStarterpack } from '@atproto/api';
import {
  AspectRatio,
  Box,
  Card,
  CardSection,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';
import { getStarterPackImage, getStarterPackLink } from '../../lib/utils/link';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  embed: AppBskyGraphDefs.StarterPackViewBasic;
}

export default function StarterPackEmbed(props: Props) {
  if (!AppBskyGraphStarterpack.isRecord(props.embed.record)) {
    return null;
  }

  const image = getStarterPackImage(props.embed);
  const { settings } = useUserSettings();

  if (settings.cardView === 'grid') {
    return (
      <Card p={'xs'} withBorder>
        <Group gap={'xs'} wrap="nowrap">
          {image && (
            <AspectRatio ratio={1 / 1}>
              <Image src={image} radius={'sm'} w={50} h={50} />
            </AspectRatio>
          )}
          <Stack gap={0}>
            <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
              Starter pack
            </Text>
            <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1} span>
              By @{props.embed.creator.handle}
            </Text>
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card
      p={0}
      component="a"
      href={getStarterPackLink(props.embed)}
      target="_blank"
      withBorder
    >
      {image && (
        <CardSection>
          <Image src={image} />
        </CardSection>
      )}
      <Box p={'xs'}>
        <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
          Starter pack
        </Text>
        <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1} span>
          By @{props.embed.creator.handle}
        </Text>
      </Box>
    </Card>
  );
}
