import {
  CheckboxCard,
  CheckboxIndicator,
  Group,
  Text,
  Tooltip,
} from '@mantine/core';
import classes from './CollectionSelectorItem.module.css';

interface Props {
  value: string;
  name: string;
  checked: boolean;
  cardCount: number;
  onChange: (checked: boolean, item: SelectableCollectionItem) => void;
  disabled?: boolean;
}

export default function CollectionSelectorItem(props: Props) {
  return (
    <Tooltip
      label="Card is already in this collection"
      disabled={!props.disabled}
    >
      <CheckboxCard
        bg={props.disabled ? 'gray.3' : undefined}
        c={props.disabled ? 'gray' : undefined}
        disabled={props.disabled}
        radius={'lg'}
        p={'sm'}
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
          <CheckboxIndicator
            disabled={props.disabled}
            checked={props.disabled || props.checked}
          />
        </Group>
      </CheckboxCard>
    </Tooltip>
  );
}
