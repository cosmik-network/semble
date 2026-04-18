import { ComAtprotoLabelDefs } from '@atproto/api';
import { Label } from '@semble/types';

type AnyLabel = ComAtprotoLabelDefs.Label | Label;

type ProfileWithLabels = {
  did?: string;
  id?: string;
  labels?: AnyLabel[];
};

const isSelfAppliedLabel = (label: AnyLabel, identifier: string) =>
  label.src === identifier;

export const isBotAccount = (profile: ProfileWithLabels): boolean => {
  const identifier = profile.did ?? profile.id;
  if (!identifier) return false;

  const labels = profile.labels ?? [];
  return labels.some(
    (l) => l.val === 'bot' && isSelfAppliedLabel(l, identifier),
  );
};
