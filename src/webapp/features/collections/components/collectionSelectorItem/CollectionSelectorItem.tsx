import { CheckboxCard, CheckboxIndicator, Group, Text } from '@mantine/core';
import classes from './CollectionSelectorItem.module.css';

interface Props {
  value: string;
  name: string;
  checked: boolean;
  cardCount: number;
  onChange: (checked: boolean, item: SelectableCollectionItem) => void;
}

export default function CollectionSelectorItem(props: Props) {
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
        })
      }
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fw={500} lineClamp={1} flex={1}>
          {props.name} {'·'} {props.cardCount}{' '}
          {props.cardCount === 1 ? 'card' : 'cards'}
        </Text>
        <CheckboxIndicator checked={props.checked} />
      </Group>
    </CheckboxCard>
  );
}
