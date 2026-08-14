import { z } from 'zod';

// SKIPPED means dismissed rather than finished: terminal like COMPLETED, but
// distinguishable.
export const OnboardingStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
]);
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

export const OnboardingStateSchema = z.object({
  userId: z.string(),
  onboardingState: OnboardingStatusSchema.nullable().optional(),
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
  pwaClicked: z.coerce.date().nullable().optional(),
  iosShortcutClicked: z.coerce.date().nullable().optional(),
  browserExtensionClicked: z.coerce.date().nullable().optional(),
  mcpClicked: z.coerce.date().nullable().optional(),
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

// Fields present in the body are written — an explicit null clears the column —
// and absent fields are left untouched. userId and updatedAt are server-owned,
// so neither is accepted here.
export const UpdateOnboardingStateRequestSchema = z.object({
  onboardingState: OnboardingStatusSchema.nullable().optional(),
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
  pwaClicked: z.coerce.date().nullable().optional(),
  iosShortcutClicked: z.coerce.date().nullable().optional(),
  browserExtensionClicked: z.coerce.date().nullable().optional(),
  mcpClicked: z.coerce.date().nullable().optional(),
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
