export type ReportReasonKey =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'sexual'
  | 'violence'
  | 'self-harm'
  | 'illegal'
  | 'misinformation'
  | 'copyright'
  | 'other';

export interface ReportReason {
  key: ReportReasonKey;
  label: string;
  description: string;
}

export const REPORT_REASONS: ReportReason[] = [
  {
    key: 'spam',
    label: 'Spam or scam',
    description: 'Repetitive promotion, phishing, or fake links',
  },
  {
    key: 'harassment',
    label: 'Harassment or bullying',
    description: 'Targeted abuse or threats aimed at a person',
  },
  {
    key: 'hate',
    label: 'Hate speech',
    description: 'Attacks based on identity such as race, religion, or gender',
  },
  {
    key: 'sexual',
    label: 'Sexually explicit content',
    description: 'Unlabeled NSFW or sexual imagery',
  },
  {
    key: 'violence',
    label: 'Violence or graphic content',
    description: 'Gore, threats, or content glorifying violence',
  },
  {
    key: 'self-harm',
    label: 'Self-harm or suicide',
    description: 'Content that encourages or depicts self-injury',
  },
  {
    key: 'illegal',
    label: 'Illegal content',
    description: 'CSAM, drugs, weapons sales, or other unlawful material',
  },
  {
    key: 'misinformation',
    label: 'Misinformation',
    description: 'Verifiably false claims with potential to cause harm',
  },
  {
    key: 'copyright',
    label: 'Copyright or IP violation',
    description: 'Unauthorized use of protected work',
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Something else — please describe in the details field',
  },
];

export const MAX_REPORT_DETAILS_LENGTH = 500;
