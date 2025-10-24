import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 900,
    width: 1720
  }
});

test('Guest -> Discover page -> Track page -> Home page', async ({ page }) => {
  await page.goto('http://localhost:4200/');
  await expect(page.getByRole('button', { name: 'Explore community' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore community' }).click();
  await expect(page.getByText('Creo - AuroraELECTRIC_BANANARSplay_arrow0favorite1calendar_todaySep 30,')).toBeVisible();
  await expect(page.getByText('access_timeNewwhatshotHotsearchSearch')).toBeVisible();
  await page.getByText('Creo - AuroraELECTRIC_BANANARSplay_arrow0favorite1calendar_todaySep 30,').click();
  await expect(page.locator('div').filter({ hasText: 'ELECTRIC_BANANARS23d agosong' }).nth(5)).toBeVisible();
  await expect(page.getByText('song is by creo (not by me!)')).toBeVisible();
  await expect(page.locator('app-card-night')).toContainText('song is by creo (not by me!)');
  await expect(page.locator('app-card-sunset')).toContainText('Creo - Aurora');
  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('button', { name: 'Hot' }).click();
  await expect(page.getByText('BAD CHORDS (WIP)schoolsplay_arrow7favorite3calendar_todaySep 19,')).toBeVisible();
  await expect(page.getByText('BAD CHORDS (WIP)')).toBeVisible();
  await page.getByRole('button', { name: 'Load more' }).click();
  await page.getByText('Synthia').click();
});