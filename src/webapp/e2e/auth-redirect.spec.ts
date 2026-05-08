import { test, expect } from '@playwright/test';

/**
 * Auth redirect tests.
 *
 * /home and /notifications have server-side guards (verifySessionOnServer).
 * /settings/* and /profile (bare) redirect via the client-side useAuth fallback.
 */

const protectedRoutes = [
  '/home',
  '/notifications',
  '/settings',
  '/profile',
];

for (const route of protectedRoutes) {
  test(`unauthenticated ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL('/login');
  });
}
