import { CheckboxCard, CheckboxIndicator, Group, Text } from '@mantine/core';
import classes from './CollectionSelectorItem.module.css';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';

interface Props {
  value: string;
  name: string;
  checked: boolean;
  cardCount: number;
  onChange: (checked: boolean, item: SelectableCollectionItem) => void;
  uri?: string;
  authorHandle?: string;
}

export default function CollectionSelectorItem(props: Props) {
  const marginUrl = getMarginUrl(props.uri, props.authorHandle);

  return (
    <CheckboxCard
      radius={'lg'}
      p={'xs'}
      className={classes.root}
      value={props.value}
      checked={props.checked}
      onChange={(checked) =>
        props.onChange(checked, {
          id: props.value,
          name: props.name,
          cardCount: props.cardCount,
          uri: props.uri,
          author: props.authorHandle
            ? { handle: props.authorHandle }
            : undefined,
        })
      }
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap={4} flex={1}>
          <Text fw={500} lineClamp={1}>
            {props.name} {'·'} {props.cardCount}{' '}
            {props.cardCount === 1 ? 'card' : 'cards'}
          </Text>
          {isMarginUri(props.uri) && (
            <MarginLogo size={12} marginUrl={marginUrl} />
          )}
        </Group>
        <CheckboxIndicator checked={props.checked} />
      </Group>
    </CheckboxCard>
  );
}
