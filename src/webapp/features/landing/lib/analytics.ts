import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';

export type LandingForm = 'search' | 'newsletter';

interface LandingVisit {
  visit_id: string;
  is_logged_in: boolean;
}

// Module level, like the other page visits, so the FAQ can report without a
// context provider. Never cleared: everything that reports here only renders
// on the landing page, and the next visit replaces this one. PostHog already
// sends the referrer and UTM params with every event, so they aren't repeated.
let currentVisit: LandingVisit | null = null;

function capture(event: string, properties?: object) {
  if (!shouldCaptureAnalytics() || !currentVisit) return;
  posthog.capture(event, { ...currentVisit, ...properties });
}

export function startLandingVisit(visit: Omit<LandingVisit, 'visit_id'>) {
  currentVisit = { ...visit, visit_id: crypto.randomUUID() };
  capture('landing:viewed');
}

/**
 * Sent once per section per visit. `section_index` is the section's place on
 * the page, so the furthest one reached is the visit's scroll depth.
 */
export function trackLandingSectionViewed(
  section: string,
  section_index: number,
) {
  capture('landing:section_viewed', { section, section_index });
}

/**
 * `link` is the path (or `#hash`) for links within Semble and the hostname for
 * everything else.
 */
export function trackLandingLinkClicked(click: {
  link: string;
  is_external: boolean;
  section: string | null;
}) {
  capture('landing:link_clicked', click);
}

export function trackLandingFormSubmitted(
  form: LandingForm,
  section: string | null,
) {
  capture('landing:form_submitted', { form, section });
}

export function trackLandingFaqOpened(question: string) {
  capture('landing:faq_opened', { question });
}
