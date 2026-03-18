import {
  BiCheckCircle,
  BiXCircle,
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
} from 'react-icons/bi';
import { BsPaperclip } from 'react-icons/bs';
import { MdOutlinePsychologyAlt } from 'react-icons/md';

export const CONNECTION_TYPES = [
  {
    value: 'RELATED',
    label: 'Related',
    description: 'Generally connected or associated',
    icon: BiLink,
    notePlaceholder: 'Describe how these are related...',
  },
  {
    value: 'SUPPORTS',
    label: 'Supports',
    description: 'Provides evidence or reasoning in favor',
    icon: BiCheckCircle,
    notePlaceholder: 'Explain how this supports or provides evidence...',
  },
  {
    value: 'OPPOSES',
    label: 'Opposes',
    description: 'Provides counter-evidence or reasoning against',
    icon: BiXCircle,
    notePlaceholder: 'Describe the counter-argument or opposing view...',
  },
  {
    value: 'ADDRESSES',
    label: 'Addresses',
    description: 'Responds to or answers a question or topic',
    icon: BiMessageSquareDetail,
    notePlaceholder: 'Explain how this responds to or answers the topic...',
  },
  {
    value: 'HELPFUL',
    label: 'Helpful',
    description: 'Provides useful context or background',
    icon: BiHelpCircle,
    notePlaceholder: 'Describe what context or background this provides...',
  },
  {
    value: 'LEADS_TO',
    label: 'Leads to',
    description: 'Led me to discover this',
    icon: BiRightArrowAlt,
    notePlaceholder: 'Explain how this link leads to the other',
  },
  {
    value: 'EXPLAINER',
    label: 'Explainer',
    description: 'Explains or summarizes for a broader audience',
    icon: MdOutlinePsychologyAlt,
    notePlaceholder: 'Describe what concepts this clarifies...',
  },
  {
    value: 'SUPPLEMENT',
    label: 'Supplement',
    description:
      'Accompanying resources (e.g. data, code, other supplemental material)',
    icon: BsPaperclip,
    notePlaceholder: 'Explain what additional information this adds...',
  },
] as const;

export type ConnectionTypeConfig = (typeof CONNECTION_TYPES)[number];
