import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 900,
    width: 1720
  }
});

test('Guest -> Discover page -> Track page -> Home page', async ({ page }) => {
  page.on('console', msg => console.log(msg.text()));
  await page.goto('http://localhost:4200/');
  await page.getByRole('button', { name: 'Explore community' }).click();
  await page.getByRole('button', { name: 'Hot' }).click();
  await expect(page.getByText('favorite').first()).toBeVisible();
  await expect(page.getByText('play_arrow').first()).toBeVisible();
  await page.getByRole('button', { name: 'New' }).click();
  await expect(page.getByText('favorite').first()).toBeVisible();
  await expect(page.getByText('play_arrow').first()).toBeVisible();
  await page.getByRole('textbox', { name: 'search...' }).click();
  await page.getByRole('textbox', { name: 'search...' }).fill('MisterRobot');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('MisterRobot')).toBeVisible();
  await page.getByText('MisterRobotUser').click();
  await expect(page.getByText('test-uploaded')).toBeVisible();
  await page.getByText('test-uploadedcalendar_todayOct 24, 2025play_arrow0favorite0').click();
  await expect(page.getByText('Login to use social features')).toBeVisible();
  await expect(page.getByText('test-uploaded')).toBeVisible();
  await expect(page.getByText('MisterRobot')).toBeVisible();
  await page.getByText('Synthia').click();
  await expect(page.locator('app-home').getByText('Synthia')).toBeVisible();
});