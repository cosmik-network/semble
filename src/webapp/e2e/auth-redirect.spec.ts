import { test, expect } from '@playwright/test';

/**
 * Auth redirect tests.
 *
 * All four routes are gated by proxy.ts (cookie-presence check at the edge);
 * /home and /notifications additionally guard via verifySessionOnServer.
 */

const protectedRoutes = ['/home', '/notifications', '/settings', '/profile'];

for (const route of protectedRoutes) {
  test(`unauthenticated ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL('/login');
  });
}
