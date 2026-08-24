import { test, expect } from '@playwright/test';

/**
 * Auth redirect tests.
 *
 * /notifications has a server-side guard (verifySessionOnServer).
 * /settings/* and /profile (bare) redirect via the client-side useAuth fallback.
 *
 * /home is deliberately NOT here: it reads the session only to decide whether
 * to show the onboarding banner, and otherwise renders the public global feed.
 */

const protectedRoutes = ['/notifications', '/settings', '/profile'];

for (const route of protectedRoutes) {
  test(`unauthenticated ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL('/login');
  });
}

test('unauthenticated /home renders instead of redirecting', async ({
  page,
}) => {
  await page.goto('/home');
  await expect(page).toHaveURL('/home');
});
