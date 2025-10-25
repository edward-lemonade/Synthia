import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 900,
    width: 1720
  }
});

test('Guest -> Login -> Studio -> Save -> Logout -> Home page', async ({ page }) => {
  page.on('console', msg => console.log(msg.text()));
  await page.goto('http://localhost:4200/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env["TEST_EMAIL"]!);
  await page.getByText('Password *').click();
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env["TEST_PASSWORD"]!);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('test-persistent')).toBeVisible();
  await page.getByText('test-persistent')
    .locator('..')  // Go up to parent container
    .getByRole('button', { name: 'Studio' })
    .click();
  await expect(page.locator('canvas').nth(2)).toBeVisible();
  await expect(page.locator('canvas').nth(3)).toBeVisible();
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('4');
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('4');
  await page.getByRole('button', { name: '| 4' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '8' }).nth(1).click();
  await page.locator('.cdk-overlay-backdrop').click();
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('5');
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('8');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('app-studio-toolbar-top')).toContainText('Saved!');
  await page.getByRole('button').filter({ hasText: 'menu' }).click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.getByText('test-persistent')).toBeVisible();
  await page.getByText('test-persistent')
    .locator('..')  // Go up to parent container
    .getByRole('button', { name: 'Studio' })
    .click();
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('5');
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('8');
  await page.getByRole('button', { name: '| 8' }).click();
  await page.getByRole('button', { name: '4' }).first().click();
  await page.getByRole('button', { name: '4' }).nth(3).click();
  await page.locator('.cdk-overlay-backdrop').click();
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('4');
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('4');
  await page.getByRole('button').filter({ hasText: 'menu' }).click();
  await page.getByRole('button', { name: 'Save and Exit' }).click();
  await page.getByText('test-persistent')
    .locator('..')  // Go up to parent container
    .getByRole('button', { name: 'Studio' })
    .click();
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('4');
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('4');
  await page.getByRole('button').filter({ hasText: 'menu' }).click();
  await page.locator('.cdk-overlay-backdrop').click();
  await expect(page.locator('canvas').nth(2)).toBeVisible();
  await expect(page.locator('canvas').nth(3)).toBeVisible();
  await page.getByRole('button').filter({ hasText: 'menu' }).click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.getByText('test-persistent')).toBeVisible();
  await page.getByRole('button', { name: 'Profile picture' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.getByText('Synthia')).toBeVisible();
});