import {
  BiCheckCircle,
  BiXCircle,
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
} from 'react-icons/bi';
import { BsPaperclip } from 'react-icons/bs';
import { LuArrowLeftRight } from 'react-icons/lu';
import { TbBlockquote } from 'react-icons/tb';
import { MdOutlinePsychologyAlt } from 'react-icons/md';
import { ConnectionType } from '@semble/types';
import { IconType } from 'react-icons';

export interface ConnectionTypeConfig {
  value: ConnectionType;
  label: string;
  description: string;
  icon: IconType;
  notePlaceholder: string;
  /**
   * Gated behind the `newConnectionTypes` feature flag. Only affects whether
   * the type can be *picked*; existing connections of this type still render
   * everywhere, so lookups must keep using the full CONNECTION_TYPES list.
   */
  isNew?: boolean;
}

export const CONNECTION_TYPES: readonly ConnectionTypeConfig[] = [
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
    notePlaceholder: 'Describe how this explains or clarifies...',
  },
  {
    value: 'SUPPLEMENT',
    label: 'Supplement',
    description:
      'Accompanying resources (e.g. data, code, other supplemental material)',
    icon: BsPaperclip,
    notePlaceholder: 'Explain what additional information this adds...',
  },
  {
    value: 'SAME_AS',
    label: 'Same as',
    description: 'The same thing in a different place (mirror, reupload, DOI)',
    icon: LuArrowLeftRight,
    notePlaceholder: 'Note where this version differs, if at all...',
    isNew: true,
  },
  {
    value: 'REFERENCES',
    label: 'References',
    description: 'Cites or points to the other',
    icon: TbBlockquote,
    notePlaceholder: 'Describe what is referenced or cited...',
    isNew: true,
  },
] as const;
