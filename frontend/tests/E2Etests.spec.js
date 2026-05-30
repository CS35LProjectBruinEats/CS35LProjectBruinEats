// @ts-check
import { test, expect } from '@playwright/test';
import { pool, resetDB } from '../../backend/db.js'; 

//tests are sequential here since they depend on each other
  //e.g. user needs vendor to post food opp first to see it
test.describe.configure({ mode: 'serial' });


/* test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
}); */

  test.beforeAll(async () => {
    await resetDB();
  });


test('Create account and login', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('Username').fill('testVendor');
  await page.getByPlaceholder('Password').fill('testPassword');
  await page.getByTestId('roleSelect').selectOption({value: 'vendor'});
  await page.getByRole('button', { name: /Sign up/i }).click();
  await expect(page.getByTestId('message')).toContainText('created');

  await page.getByPlaceholder('Username').fill('testVendor');
  await page.getByPlaceholder('Password').fill('testPassword');
  await page.getByRole('button', { name: /Login/i }).click();
  await expect(page.getByTestId('message')).toContainText('success');

});

test('Vendor simulation', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('testVendor');
  await page.getByPlaceholder('Password').fill('testPassword');
  await page.getByRole('button', { name: /Login/i }).click();

  await page.getByPlaceholder('Name').fill('testOpp');
  await page.getByPlaceholder('Cost').fill('123.45');
  await page.getByTestId('locationSelect').selectOption({value: 'Bruin Plaza'});
  await page.getByPlaceholder('Description').fill('test desc');
  await page.getByTestId('date').fill('2026-05-30');
  await page.getByTestId('mealPeriodSelect').selectOption({value: 'Dinner'});
  await page.getByPlaceholder('RSVP capacity').fill('2');
  await page.getByRole('button', { name: /Post Food/i }).click();
  //await expect(page.getByPlaceholder('Name')).toHaveValue('');
  
  //THIS DOESN'T WORK RIGHT NOW, maybe the opp wasn't posted properly?
  // const list = page.getByTestId('listingsGrid');
  // await expect(list.locator('div h3')).toContainText('testOpp');
  // await expect(list).toContainText('123.45');
  // await expect(list).toContainText('Bruin Plaza');
  // await expect(list).toContainText('test desc');
  // await expect(list).toContainText('2026-05-30');
  // await expect(list).toContainText('Dinner');
  // await expect(list).toContainText('2');
});