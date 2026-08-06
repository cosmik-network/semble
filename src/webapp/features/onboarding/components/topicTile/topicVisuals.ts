import type { IconType } from 'react-icons/lib';
import { IoMdCode } from 'react-icons/io';
import { MdOutlineTag } from 'react-icons/md';
import {
  TbAffiliate,
  TbBrain,
  TbBuildingBank,
  TbChartLine,
  TbFeather,
  TbFlask,
  TbLeaf,
  TbMusic,
  TbNetwork,
  TbNotebook,
  TbSparkles,
  TbStack2,
  TbTool,
  TbUsersGroup,
} from 'react-icons/tb';
import type { TopicId } from '../../lib/topics';

/**
 * One colour for every tile. Fifteen hues read as a rainbow and made the grid
 * noisy; a single accent lets the picked/unpicked split carry the whole signal.
 * Tangerine is the theme's primary, which also ties the tiles to the count
 * badge above them. Swap this one value to change the whole grid.
 */
export const TOPIC_COLOR = 'tangerine';

/**
 * Kept out of `lib/topics.ts` so the registry stays free of React and
 * react-icons — the same split `STEP_ICONS` uses in `stepper/Stepper.tsx`. A
 * Record keyed by TopicId rather than a lookup with a fallback: adding a topic
 * id is a type error until it has an icon.
 */
export const TOPIC_ICONS: Record<TopicId, IconType> = {
  science: TbFlask,
  ai: TbSparkles,
  'software-development': IoMdCode,
  community: TbUsersGroup,
  atproto: TbAffiliate,
  'social-networks': TbNetwork,
  music: TbMusic,
  writing: TbFeather,
  'note-taking': TbNotebook,
  pkm: TbBrain,
  politics: TbBuildingBank,
  curation: TbStack2,
  'product-building': TbTool,
  business: TbChartLine,
  nature: TbLeaf,
};

/** Custom topics have no authored icon, so they all wear the generic tag. */
export const CUSTOM_TOPIC_ICON = MdOutlineTag;
