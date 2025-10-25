import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 900,
    width: 1720
  }
});

test('Guest -> Login -> Logout -> Home page', async ({ page }) => {
  page.on('console', msg => console.log(msg.text()));
  await page.goto('http://localhost:4200/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(process.env["TEST_EMAIL"]!);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env["TEST_PASSWORD"]!);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Synthia')).toBeVisible();
  await expect(page.getByText('add New Project')).toBeVisible();
  await page.getByRole('button', { name: 'Profile picture' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.getByText('Synthia')).toBeVisible();
});