import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with title and subtitle', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Save what matters');
    await expect(
      page.getByText('collaborative space for mapping the web').first(),
    ).toBeVisible();
  });

  test('shows sign up and log in buttons for unauthenticated users', async ({
    page,
  }) => {
    const signUp = page.getByRole('link', { name: 'Sign up' });
    const logIn = page.getByRole('link', { name: 'Log in' });

    await expect(signUp).toBeVisible();
    await expect(logIn).toBeVisible();

    await expect(signUp).toHaveAttribute('href', '/signup');
    await expect(logIn).toHaveAttribute('href', '/login');
  });

  test('renders testimonials section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /word on Semble/ }),
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: 'a collection' }),
    ).toBeVisible();
  });
});
