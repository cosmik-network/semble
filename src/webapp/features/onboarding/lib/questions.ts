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
 * The one id with behaviour attached: picking it reveals a text field, and
 * dropping it clears whatever was typed there.
 */
export const OTHER_ID = 'other';

/**
 * Stored in localStorage today. When they are sent to the server they map
 * straight onto `onboarding_state.intention` and `.referral_source`, both
 * `text[]`, as the id array exactly as it is held here. The free text travels
 * in its own field rather than encoded into the array.
 */
export const INTENTION_QUESTION: Question = {
  prompt: 'What do you want to use Semble for?',
  multiple: true,
  otherLabel: 'Tell us more',
  otherPlaceholder: 'What you are hoping to get out of Semble',
  options: [
    { id: 'bookmarks', label: 'Managing and organizing personal bookmarks' },
    { id: 'discovery', label: 'Following curators and discovering content' },
    { id: 'community', label: 'Contributing to a community knowledge network' },
    { id: 'sharing', label: 'Sharing knowledge with my network' },
    { id: 'testing', label: 'Unsure — just testing the app' },
    { id: OTHER_ID, label: 'Other' },
  ],
};

export const REFERRAL_QUESTION: Question = {
  prompt: 'How did you hear about us?',
  multiple: false,
  otherLabel: 'Tell us where',
  otherPlaceholder: 'Where you came across Semble',
  options: [
    { id: 'friend', label: 'A friend' },
    { id: 'social', label: 'Bluesky or social media' },
    { id: 'blog', label: 'A blog post' },
    { id: 'search', label: 'Search result or AI' },
    { id: OTHER_ID, label: 'Other' },
  ],
};
