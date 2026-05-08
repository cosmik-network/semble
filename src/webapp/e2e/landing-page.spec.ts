import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with title and subtitle', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('A social knowledge network for');
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

  test('renders community highlights section', async ({ page }) => {
    await expect(
      page.getByText('Highlights from our community'),
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: 'Explore' }),
    ).toBeVisible();
  });


  test('renders footer with social and doc links', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'Follow our blog' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Semble Docs' }),
    ).toBeVisible();
  });
});
