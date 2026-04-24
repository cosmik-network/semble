import { test, expect } from '@playwright/test';

test('unauthenticated user can access a profile page', async ({ page }) => {
  const response = await page.goto('/profile/alice.bsky.social');

  expect(response?.status()).toBe(200);

  // Should stay on the profile page and NOT redirect to /login
  await expect(page).toHaveURL(/\/profile\/alice\.bsky\.social/);

  // Profile header should be visible
  await expect(page.getByText('@alice.bsky.social')).toBeVisible();
});
