import {
  BiCheckCircle,
  BiXCircle,
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
} from 'react-icons/bi';
import { MdOutlinePsychologyAlt } from 'react-icons/md';
import { PiNewspaperClipping } from 'react-icons/pi';
import { IconType } from 'react-icons';

export const CONNECTION_TYPES = [
  {
    value: 'SUPPORTS',
    label: 'Supports',
    description: 'Provides evidence or reasoning in favor',
    icon: BiCheckCircle,
    notePrompt: 'How does this support it?',
    notePlaceholder: 'Explain how this supports or provides evidence...',
  },
  {
    value: 'OPPOSES',
    label: 'Opposes',
    description: 'Provides counter-evidence or reasoning against',
    icon: BiXCircle,
    notePrompt: 'How does this oppose it?',
    notePlaceholder: 'Describe the counter-argument or opposing view...',
  },
  {
    value: 'ADDRESSES',
    label: 'Addresses',
    description: 'Responds to or answers a question or topic',
    icon: BiMessageSquareDetail,
    notePrompt: 'How does this address it?',
    notePlaceholder: 'Explain how this responds to or answers the topic...',
  },
  {
    value: 'HELPFUL',
    label: 'Helpful',
    description: 'Provides useful context or background',
    icon: BiHelpCircle,
    notePrompt: 'How is this helpful?',
    notePlaceholder: 'Describe what context or background this provides...',
  },
  {
    value: 'LEADS_TO',
    label: 'Leads to',
    description: 'Led me to discover this',
    icon: BiRightArrowAlt,
    notePrompt: 'How does this lead to it?',
    notePlaceholder: 'Explain how this link leads to the other',
  },
  {
    value: 'RELATED',
    label: 'Related',
    description: 'Generally connected or associated',
    icon: BiLink,
    notePrompt: 'How are these related?',
    notePlaceholder: 'Describe how these are connected...',
  },
  {
    value: 'SUPPLEMENT',
    label: 'Supplement',
    description:
      'Accompanying resources (e.g. data, code, other supplemental material)',
    icon: PiNewspaperClipping,
    notePrompt: 'What does this add?',
    notePlaceholder: 'Explain what additional information this adds...',
  },
  {
    value: 'EXPLAINER',
    label: 'Explainer',
    description: 'Explains or summarizes for a broader audience',
    icon: MdOutlinePsychologyAlt,
    notePrompt: 'What does this explain?',
    notePlaceholder: 'Describe what concepts this clarifies...',
  },
] as const;

export type ConnectionTypeConfig = (typeof CONNECTION_TYPES)[number];
