'use client';

import { Checkbox, Radio, Stack, Textarea, Title } from '@mantine/core';
import { OTHER_ID, type Question } from '../../lib/questions';

const OTHER_MAX_LENGTH = 200;
const OTHER_MEASURE = 420;

interface Props {
  question: Question;
  selected: string[];
  otherText: string;
  /** Both at once: dropping `other` has to clear the text in the same write. */
  onChange: (next: { selected: string[]; otherText: string }) => void;
}

export default function QuestionGroup(props: Props) {
  const commit = (selected: string[]) => {
    props.onChange({
      selected,
      otherText: selected.includes(OTHER_ID) ? props.otherText : '',
    });
  };

  const options = props.question.options;

  return (
    <Stack gap={'sm'}>
      {/* A real heading rather than the group's own `label`, which is styled as
          a form label. The aria-label below names the group instead. */}
      <Title order={2} fz={'lg'} fw={600}>
        {props.question.prompt}
      </Title>

      {props.question.multiple ? (
        <Checkbox.Group
          value={props.selected}
          onChange={commit}
          aria-label={props.question.prompt}
        >
          <Stack gap={'xs'}>
            {options.map((option) => (
              <Checkbox
                key={option.id}
                value={option.id}
                label={option.label}
                radius={'xl'}
                size="md"
              />
            ))}
          </Stack>
        </Checkbox.Group>
      ) : (
        <Radio.Group
          // Stored as an array like every other answer, so both questions keep
          // one shape in the column behind them.
          value={props.selected[0] ?? ''}
          onChange={(value) => commit([value])}
          aria-label={props.question.prompt}
        >
          <Stack gap={'xs'}>
            {options.map((option) => (
              <Radio
                key={option.id}
                value={option.id}
                label={option.label}
                size="md"
              />
            ))}
          </Stack>
        </Radio.Group>
      )}

      {props.selected.includes(OTHER_ID) && (
        <Textarea
          label={props.question.otherLabel}
          placeholder={props.question.otherPlaceholder}
          value={props.otherText}
          onChange={(event) =>
            props.onChange({
              selected: props.selected,
              otherText: event.currentTarget.value,
            })
          }
          autosize
          minRows={4}
          maxRows={5}
          maxLength={OTHER_MAX_LENGTH}
          maw={OTHER_MEASURE}
          radius={'md'}
        />
      )}
    </Stack>
  );
}
