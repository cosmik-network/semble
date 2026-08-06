import { z } from 'zod';

// Full onboarding state as the client sees it. Every field except the
// server-derived userId is optional. Returned by the GET endpoint and as the
// merged result of an update.
export const OnboardingStateSchema = z.object({
  userId: z.string(),
  onboardingCompleted: z.boolean().nullable().optional(),
  topicsSelected: z.array(z.string()).nullable().optional(),
  linksSuggested: z.array(z.string()).nullable().optional(),
  linksSelected: z.array(z.string()).nullable().optional(),
  suggestedAccounts: z.array(z.string()).nullable().optional(),
  suggestedCollections: z.array(z.string()).nullable().optional(),
  followedAccounts: z.array(z.string()).nullable().optional(),
  followedCollections: z.array(z.string()).nullable().optional(),
  firstCards: z.array(z.string()).nullable().optional(),
  firstCollection: z.string().nullable().optional(),
  firstConnection: z.string().nullable().optional(),
  pwaInstalled: z.coerce.date().nullable().optional(),
  iosShortcutInstalled: z.coerce.date().nullable().optional(),
  browserExtensionInstalled: z.coerce.date().nullable().optional(),
  saveModalGuideCompleted: z.coerce.date().nullable().optional(),
  connectionCreationModalCompleted: z.coerce.date().nullable().optional(),
  semblePageNavigationCompleted: z.coerce.date().nullable().optional(),
  intention: z.array(z.string()).nullable().optional(),
  referralSource: z.array(z.string()).nullable().optional(),
  updatedAt: z.coerce.date(),
});
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export const GetOnboardingStateResponseSchema = OnboardingStateSchema;
export type GetOnboardingStateResponse = z.infer<
  typeof GetOnboardingStateResponseSchema
>;

// Partial update: the client sends only the fields it wants to change. userId
// is derived from the authenticated request and updatedAt is server-managed, so
// neither is accepted here. Fields present in the body are written (explicit
// null clears them); absent fields are left untouched.
export const UpdateOnboardingStateRequestSchema = z.object({
  onboardingCompleted: z.boolean().nullable().optional(),
  topicsSelected: z.array(z.string()).nullable().optional(),
  linksSuggested: z.array(z.string()).nullable().optional(),
  linksSelected: z.array(z.string()).nullable().optional(),
  suggestedAccounts: z.array(z.string()).nullable().optional(),
  suggestedCollections: z.array(z.string()).nullable().optional(),
  followedAccounts: z.array(z.string()).nullable().optional(),
  followedCollections: z.array(z.string()).nullable().optional(),
  firstCards: z.array(z.string()).nullable().optional(),
  firstCollection: z.string().nullable().optional(),
  firstConnection: z.string().nullable().optional(),
  pwaInstalled: z.coerce.date().nullable().optional(),
  iosShortcutInstalled: z.coerce.date().nullable().optional(),
  browserExtensionInstalled: z.coerce.date().nullable().optional(),
  saveModalGuideCompleted: z.coerce.date().nullable().optional(),
  connectionCreationModalCompleted: z.coerce.date().nullable().optional(),
  semblePageNavigationCompleted: z.coerce.date().nullable().optional(),
  intention: z.array(z.string()).nullable().optional(),
  referralSource: z.array(z.string()).nullable().optional(),
});
export type UpdateOnboardingStateRequest = z.infer<
  typeof UpdateOnboardingStateRequestSchema
>;

export const UpdateOnboardingStateResponseSchema = OnboardingStateSchema;
export type UpdateOnboardingStateResponse = z.infer<
  typeof UpdateOnboardingStateResponseSchema
>;
