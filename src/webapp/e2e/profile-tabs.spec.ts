import { test, expect } from '@playwright/test';

const HANDLE = 'alice.bsky.social';
const BASE = `/profile/${HANDLE}`;

test.describe('Profile tab navigation', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response?.status()).toBe(200);

    // Wait for the tab bar to be present
    await expect(page.getByRole('tab', { name: /Activity/ })).toBeVisible();
  });

  test('Activity tab is active by default', async ({ page }) => {
    const activityTab = page.getByRole('tab', { name: /Activity/ });
    await expect(activityTab).toHaveAttribute('data-active', 'true');
    await expect(page).toHaveURL(new RegExp(`${BASE}$`));
    await expect(page.getByRole('tab', { name: /^Profile$/ })).toHaveCount(0);
  });

  test('legacy /activity URL redirects to base profile', async ({ page }) => {
    const response = await page.goto(`${BASE}/activity`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`${BASE}$`));
    await expect(page.getByRole('tab', { name: /Activity/ })).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  test('can navigate to Cards tab', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Cards/ });
    await tab.click();

    await expect(page).toHaveURL(`${BASE}/cards`);
    await expect(tab).toHaveAttribute('data-active', 'true');
  });

  test('can navigate to Collections tab', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Collections/ });
    await tab.click();

    await expect(page).toHaveURL(`${BASE}/collections`);
    await expect(tab).toHaveAttribute('data-active', 'true');
  });

  test('can navigate to Connections tab', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Connections/ });
    await tab.click();

    await expect(page).toHaveURL(`${BASE}/connections`);
    await expect(tab).toHaveAttribute('data-active', 'true');
  });

  test('can navigate to Network tab', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /Network/ });
    await tab.click();

    await expect(page).toHaveURL(`${BASE}/network`);
    await expect(tab).toHaveAttribute('data-active', 'true');
  });

  test('tabs do not redirect to /login (profile is public)', async ({
    page,
  }) => {
    const tabRoutes = ['cards', 'collections', 'connections', 'network'];

    for (const route of tabRoutes) {
      const response = await page.goto(`${BASE}/${route}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(`${BASE}/${route}`);
    }
  });
});
