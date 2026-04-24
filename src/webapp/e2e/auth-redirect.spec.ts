import { test, expect } from '@playwright/test';

test('unauthenticated /settings visit redirects to /login', async ({
  page,
}) => {
  const response = await page.goto('/settings');
  console.log('status:', response?.status(), 'final url:', page.url());

  await expect(page).toHaveURL('/login');
});

test('unauthenticated /notifications visit redirects to /login', async ({
  page,
}) => {
  const response = await page.goto('/notifications');
  console.log('status:', response?.status(), 'final url:', page.url());

  await expect(page).toHaveURL('/login');
});

test('unauthenticated /home visit redirects to /login', async ({ page }) => {
  const response = await page.goto('/home');
  console.log('status:', response?.status(), 'final url:', page.url());

  await expect(page).toHaveURL('/login');
});
