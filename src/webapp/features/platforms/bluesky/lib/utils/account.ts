import { ComAtprotoLabelDefs } from '@atproto/api';

type ProfileWithLabels = {
  did: string;
  labels?: ComAtprotoLabelDefs.Label[];
};

const isSelfAppliedLabel = (label: ComAtprotoLabelDefs.Label, did: string) =>
  label.src === did;

export const isBotAccount = (profile: ProfileWithLabels): boolean => {
  const { did, labels = [] } = profile;
  return labels.some((l) => l.val === 'bot' && isSelfAppliedLabel(l, did));
};
