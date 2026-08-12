'use client';

import { Checkbox, Radio, Stack, Textarea, Title } from '@mantine/core';
import { OTHER_ID, type Question } from '../../lib/questions';

const OTHER_MAX_LENGTH = 200;
const OTHER_MEASURE = 420;

interface Props {
  question: Question;
  /** Option ids currently picked. One at most on a single-choice question. */
  selected: string[];
  /** Free text for the `other` option. Meaningless unless it is picked. */
  otherText: string;
  /**
   * Both values at once, because they change together: dropping `other` has to
   * clear the text in the same write.
   */
  onChange: (next: { selected: string[]; otherText: string }) => void;
}

export default function QuestionGroup(props: Props) {
  // Unticking or moving off "Other" throws its answer away rather than parking
  // it where it would be sent alongside an option nobody chose.
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
          a form label — the aria-label below is what names the group in
          assistive tech. */}
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
          // Stored as an array like every other answer, so the one column behind
          // both questions keeps one shape.
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
