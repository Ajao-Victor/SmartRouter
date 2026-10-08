import { expect, test } from '@playwright/test';

/**
 * PDF demo path on mocks: deposit → allocation → task → recommendation → result → top-up → receipt.
 * Runs against `NEXT_PUBLIC_MOCK=1 pnpm dev` (playwright.config webServer).
 */
test.describe('demo path', () => {
  test('deposit → allocation → task → recommendation → result → top-up → receipt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tell SmartRouter what you want done');

    // Sign in (mock passkey dialog) → app
    await page.getByRole('button', { name: 'Sign in with passkey' }).click();
    await page.waitForURL('**/chat');

    // Wallet: deposit (mock adds $2 USDC.e) and open the allocation
    await page.getByRole('button', { name: 'Wallet' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('USDC.E');
    await sheet.getByRole('button', { name: 'Deposit' }).click();
    await expect(sheet).toContainText('$14.50');
    await page.keyboard.press('Escape');

    // Task: describe it → classified and quoted as the first prompt
    await page.getByLabel('Or describe the task').fill('Write a short cover letter for a payments engineer role at Paystack');
    await page.getByRole('button', { name: 'Get a quote' }).click();
    await page.waitForURL('**/chat/**');

    // Recommendation: four options with attribution
    const options = page.getByRole('option');
    await expect(options).toHaveCount(4);
    await expect(page.getByText('Quality data: LMArena, Artificial Analysis').first()).toBeVisible();
    await expect(page.getByRole('option', { name: 'Free · Llama 3.1 8B' })).toBeVisible();

    // Result: run the top pick and stream a reply with its model tag and receipt link
    await page.getByRole('button', { name: /Auto · run top pick/ }).click();
    await expect(page.getByRole('button', { name: 'Receipt' }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel('Assistant reply').first()).toContainText('via MPP');

    // Receipt: session id now, settlement later
    await page.getByRole('button', { name: 'Receipt' }).first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toContainText('Session');
    await page.keyboard.press('Escape');

    // Top-up from the HUD panel (no automatic top-ups)
    await page.getByRole('button', { name: /Allocation: \$/ }).click();
    await page.getByRole('button', { name: /Top up \$2/ }).first().click();
    await expect(page.getByText('Topped up')).toBeVisible();
  });
});
