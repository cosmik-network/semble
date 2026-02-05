import {
  Avatar,
  CheckboxCard,
  CheckboxIndicator,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import classes from './CollectionSelectorItem.module.css';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import { Collection, CollectionAccessType } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  collection: Collection;
  checked: boolean;
  onChange: (checked: boolean, item: Collection) => void;
}

export default function CollectionSelectorItem(props: Props) {
  const marginUrl = getMarginUrl(
    props.collection.uri,
    props.collection.author?.handle,
  );

  return (
    <CheckboxCard
      radius={'lg'}
      p={'xs'}
      className={classes.root}
      value={props.collection.id}
      checked={props.checked}
      onChange={(checked) => props.onChange(checked, props.collection)}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap={'xs'} flex={1} wrap="nowrap">
          {props.collection.accessType === CollectionAccessType.OPEN && (
            <ThemeIcon variant="light" radius={'xl'} size={'xs'} color="green">
              <FaSeedling size={8} />
            </ThemeIcon>
          )}
          {isMarginUri(props.collection.uri) && (
            <MarginLogo size={12} marginUrl={marginUrl} />
          )}
          <Text fw={500} lineClamp={1}>
            {props.collection.name}
          </Text>
        </Group>
        <Avatar
          src={props.collection.author.avatarUrl?.replace(
            'avatar',
            'avatar_thumbnail',
          )}
          alt={`${props.collection.author.handle}'s avatar`}
          size={'sm'}
        />
        <CheckboxIndicator checked={props.checked} />
      </Group>
    </CheckboxCard>
  );
}
