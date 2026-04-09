import {
  moderatePost,
  AppBskyFeedDefs,
  DEFAULT_LABEL_SETTINGS,
  ModerationUI,
} from '@atproto/api';
import type { ModerationOpts } from '@atproto/api';

const DEFAULT_MODERATION_OPTS: ModerationOpts = {
  userDid: undefined,
  prefs: {
    // NOTE: this was false by default, but we don't want to filter it out entirely for now
    adultContentEnabled: true,
    labels: {
      ...DEFAULT_LABEL_SETTINGS,
      nudity: 'warn',
    },
    labelers: [
      {
        did: 'did:plc:ar7c4by46qjdydhdevvrndac',
        labels: {},
      },
    ],
    mutedWords: [],
    hiddenPosts: [],
  },
};

type ModerationContext =
  | 'profileList'
  | 'profileView'
  | 'avatar'
  | 'banner'
  | 'displayName'
  | 'contentList'
  | 'contentView'
  | 'contentMedia';

interface Props {}

export function getPostModerationUI(
  post: AppBskyFeedDefs.PostView,
  context: ModerationContext = 'contentMedia',
): ModerationUI {
  const decision = moderatePost(post, DEFAULT_MODERATION_OPTS);
  return decision.ui(context);
}

const LABEL_REASON_MAP: Record<string, string> = {
  porn: 'Adult content',
  sexual: 'Sexually suggestive',
  nudity: 'Nudity',
  'graphic-media': 'Graphic media',
  gore: 'Violence / gore',
  '!warn': 'Content warning',
  '!hide': 'Hidden by moderator',
};

export function getModerationReasonText(ui: ModerationUI): string {
  const cause = ui.blurs[0];
  if (cause?.type === 'label') {
    return (
      LABEL_REASON_MAP[cause.labelDef.identifier] ??
      cause.labelDef.identifier ??
      'Content warning'
    );
  }
  return 'Content warning';
}
