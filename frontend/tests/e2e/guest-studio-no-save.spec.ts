import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 900,
    width: 1720
  }
});

test('Guest -> Studio page -> Home page', async ({ page }) => {
  await page.goto('http://localhost:4200/');
  await page.getByText('Welcome toSynthiaMake music.').click();
  await page.getByText('Welcome toSynthiaMake music.').click();
  await expect(page.getByText('Welcome toSynthiaMake music.')).toBeVisible();
  await page.getByRole('button', { name: 'Enter studio' }).click();
  await expect(page.getByText('Synthia')).toBeVisible();
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: 'E♭' }).click();
  await page.getByRole('button', { name: 'Minor' }).click();
  await page.locator('.cdk-overlay-backdrop').click();
  await expect(page.locator('studio-toolbar-details-key')).toContainText('E♭m');
  await page.getByRole('textbox', { name: 'bpm' }).click();
  await page.getByRole('textbox', { name: 'bpm' }).click();
  await page.getByRole('textbox', { name: 'bpm' }).dblclick();
  await page.getByRole('textbox', { name: 'bpm' }).fill('999');
  await page.locator('.viewport-body > .container > .scroll-container').click();
  await page.getByRole('textbox', { name: 'bpm' }).click();
  await page.getByRole('textbox', { name: 'bpm' }).click();
  await page.getByRole('button', { name: '| 4' }).click();
  await page.getByRole('button', { name: '11' }).click();
  await page.getByRole('button', { name: '8' }).nth(1).click();
  await page.locator('.cdk-overlay-backdrop').click();
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('11');
  await expect(page.locator('studio-toolbar-details-tempo')).toContainText('8');
  await page.getByRole('button', { name: 'Add Track' }).click();
  await expect(page.locator('#mat-menu-panel-3')).toBeVisible();
  await page.getByRole('button', { name: 'Instrument' }).click();
  await expect(page.getByText('more_vertM S')).toBeVisible();
  await page.locator('div').filter({ hasText: 'more_vertM S' }).nth(4).click();
  await expect(page.locator('.mat-context-menu-trigger')).toBeVisible();
  await page.locator('.mat-context-menu-trigger').click({
    button: 'right'
  });
  await page.getByRole('menuitem', { name: 'Create region' }).click();
  await expect(page.locator('viewport-track-region canvas')).toBeVisible();
  await page.locator('viewport-track-region canvas').click({
    position: {
      x: 51,
      y: 46
    }
  });
  await page.getByRole('button', { name: 'Instrument' }).click();
  await expect(page.locator('div').filter({ hasText: 'Reverb' }).nth(5)).toBeVisible();
  await page.getByRole('button', { name: 'MIDI Editor' }).click();
  await expect(page.locator('.scroll-container > div:nth-child(6) > div:nth-child(8)')).toBeVisible();
  await page.getByRole('button').filter({ hasText: /^edit$/ }).click();
  await page.locator('.scroll-container > div:nth-child(6) > div:nth-child(2)').click();
  await expect(page.locator('.note')).toBeVisible();
  await page.getByRole('button', { name: 'MIDI Editor' }).click();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button').filter({ hasText: 'menu' }).click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.getByText('Synthia')).toBeVisible();
});