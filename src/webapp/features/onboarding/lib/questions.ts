export interface ChoiceOption {
  /**
   * Persisted, never displayed. Treat as frozen: changing one orphans every
   * answer already stored against the old value.
   */
  id: string;
  label: string;
}

export interface Question {
  prompt: string;
  multiple: boolean;
  otherLabel: string;
  otherPlaceholder: string;
  options: ChoiceOption[];
}

/**
 * The one id with behaviour attached: picking it reveals a text field.
 * `lib/otherAnswer.ts` owns how that text is folded into the stored array.
 */
export const OTHER_ID = 'other';

export const INTENTION_QUESTION: Question = {
  prompt: 'What do you want to use Semble for? (select 1 or more)',
  multiple: true,
  otherLabel: 'Tell us more',
  otherPlaceholder: 'What you are hoping to get out of Semble',
  options: [
    { id: 'bookmarks', label: 'Managing and organizing personal bookmarks' },
    { id: 'discovery', label: 'Following curators and discovering content' },
    { id: 'community', label: 'Contributing to a community knowledge network' },
    { id: 'sharing', label: 'Sharing content with others' },
    { id: 'testing', label: 'Unsure — just testing the app' },
    { id: OTHER_ID, label: 'Other' },
  ],
};

export const REFERRAL_QUESTION: Question = {
  prompt: 'How did you hear about us? (select 1)',
  multiple: false,
  otherLabel: 'Tell us where',
  otherPlaceholder: 'Where you came across Semble',
  options: [
    { id: 'friend', label: 'A friend' },
    { id: 'social', label: 'Bluesky/social media' },
    { id: 'blog', label: 'A blog post' },
    { id: 'search', label: 'Search result or AI' },
    { id: OTHER_ID, label: 'Other' },
  ],
};
