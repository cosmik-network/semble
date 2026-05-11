import { useState } from 'react';
import {
  Button,
  Stack,
  Modal,
  Select,
  Textarea,
  Text,
  Group,
  ThemeIcon,
} from '@mantine/core';
import { BsExclamation } from 'react-icons/bs';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import {
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_REASONS,
  ReportReasonKey,
} from './reportReasons';
import { IoMdCheckmark } from 'react-icons/io';

export type ReportCardModalState =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  | { kind: 'already-reported' };

export interface ReportSubmission {
  cardId: string;
  reason: ReportReasonKey;
  details: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  //if omitted, a mock submission resolves after ~800ms (used by Storybook)
  onSubmit?: (input: ReportSubmission) => Promise<void>;
  //Forces the modal into a particular state (used by Storybook)
  initialState?: ReportCardModalState;
}

const mockSubmit = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 800));

export default function ReportCardModal(props: Props) {
  const [state, setState] = useState<ReportCardModalState>(
    props.initialState ?? { kind: 'form' },
  );
  const [reason, setReason] = useState<ReportReasonKey | null>(null);
  const [details, setDetails] = useState('');

  const resetForm = () => {
    setState(props.initialState ?? { kind: 'form' });
    setReason(null);
    setDetails('');
  };

  const detailsRequired = reason === 'other';
  const detailsValid = !detailsRequired || details.trim().length > 0;
  const canSubmit = state.kind === 'form' && reason !== null && detailsValid;

  const handleSubmit = async () => {
    if (!canSubmit || reason === null) return;
    setState({ kind: 'submitting' });
    try {
      const submitter = props.onSubmit ?? mockSubmit;
      await submitter({
        cardId: props.cardId,
        reason,
        details: details.trim(),
      });
      setState({ kind: 'success' });
    } catch (err) {
      setState({
        kind: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not submit your report. Please try again.',
      });
    }
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      onExitTransitionEnd={resetForm}
      title="Report card"
      size="sm"
      overlayProps={DANGER_OVERLAY_PROPS}
      centered
      onClick={(e) => e.stopPropagation()}
    >
      {state.kind === 'already-reported' ? (
        <AlreadyReportedState onClose={props.onClose} />
      ) : state.kind === 'success' ? (
        <SuccessState onClose={props.onClose} />
      ) : (
        <Stack gap="md">
          <Select
            label="Why are you reporting this card?"
            placeholder="Select a reason"
            variant="filled"
            withAsterisk
            data={REPORT_REASONS.map((r) => ({
              value: r.key,
              label: r.label,
            }))}
            value={reason}
            onChange={(value) => setReason(value as ReportReasonKey | null)}
            disabled={state.kind === 'submitting'}
            renderOption={({ option }) => {
              const r = REPORT_REASONS.find((x) => x.key === option.value);
              return (
                <Stack gap={2}>
                  <Text size="sm">{option.label}</Text>
                  {r?.description && (
                    <Text size="xs" c="dimmed">
                      {r.description}
                    </Text>
                  )}
                </Stack>
              );
            }}
          />

          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Additional details{' '}
                {detailsRequired ? (
                  <Text span c="red">
                    *
                  </Text>
                ) : (
                  <Text span c="dimmed" size="sm">
                    (optional)
                  </Text>
                )}
              </Text>
              <Text size="xs" c="dimmed">
                {details.length} / {MAX_REPORT_DETAILS_LENGTH}
              </Text>
            </Group>
            <Textarea
              placeholder="Add context that will help our moderators"
              variant="filled"
              rows={3}
              maxLength={MAX_REPORT_DETAILS_LENGTH}
              value={details}
              onChange={(e) => setDetails(e.currentTarget.value)}
              disabled={state.kind === 'submitting'}
              error={
                detailsRequired && details.length === 0
                  ? 'Please add a short description'
                  : undefined
              }
            />
          </Stack>

          {state.kind === 'error' && (
            <Text size="xs" fw={600} c="red">
              {state.message}
            </Text>
          )}

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={props.onClose}
              disabled={state.kind === 'submitting'}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleSubmit}
              loading={state.kind === 'submitting'}
              disabled={!canSubmit}
            >
              Submit report
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <Stack gap="md" align="center">
      <ThemeIcon variant="light" color="green" size={'xl'} radius="xl">
        <IoMdCheckmark size={24} />
      </ThemeIcon>
      <Stack gap={4} align="center">
        <Text fw={600}>Report received</Text>
        <Text size="sm" c="dimmed" ta="center">
          Our moderators will review it. Thanks for helping keep Semble safe —
          your report stays anonymous.
        </Text>
      </Stack>
      <Button onClick={onClose} fullWidth>
        Ok
      </Button>
    </Stack>
  );
}

function AlreadyReportedState({ onClose }: { onClose: () => void }) {
  return (
    <Stack gap="md" align="center">
      <ThemeIcon variant="light" color="gray" size={'xl'} radius="xl">
        <BsExclamation size={24} />
      </ThemeIcon>
      <Stack gap={4} align="center">
        <Text fw={600}>You&apos;ve already reported this card</Text>
        <Text size="sm" c="dimmed" ta="center">
          Our moderators are reviewing it.
        </Text>
      </Stack>
      <Button onClick={onClose} fullWidth>
        Close
      </Button>
    </Stack>
  );
}
