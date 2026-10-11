import { expect, test } from '@playwright/test';

/**
 * Handover demo path on mocks: signed out the chat screen works (guest mode) → describe the task
 * → recommendations → pick a model → sign-in (mock Privy → POST /auth/privy → X-Session-Token) →
 * the kept message sends automatically → streamed answer with charge and receipt → wallet shows
 * the deposit → new deposit (close-and-reopen) → activity.
 * Runs against `NEXT_PUBLIC_MOCK=1 next dev` (playwright.config webServer).
 */
test.describe('demo path', () => {
  test('guest → describe → pick a model → sign in → answer → receipt → new deposit → activity', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tell SmartRouter what you want done');

    // Open the app signed out: the normal chat screen, no sign-in wall.
    await page.getByRole('button', { name: 'Open app' }).click();
    await page.waitForURL('**/chat');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Guest recommendations (POST /recommend → guest: true)
    const task = 'Write a short cover letter for a payments engineer role at Paystack';
    await page.getByLabel('Describe the task').fill(task);
    await page.getByRole('button', { name: 'Get options' }).click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(4);
    await expect(page.getByText('Quality data: LMArena, Artificial Analysis').first()).toBeVisible();
    await expect(page.getByRole('option', { name: 'Free · Llama 3.1 8B' })).toBeVisible();

    // Pick → sign-in (mock Privy) → the chat opens and the kept message sends on its own.
    await options.first().click();
    await page.waitForURL('**/chat/**');
    const reply = page.getByLabel('Assistant reply').first();
    await expect(reply.getByRole('button', { name: 'Receipt' })).toBeVisible({ timeout: 20_000 });
    await expect(reply).toContainText('Cover letter');
    await expect(page.getByRole('button', { name: /Allocation: \$1\.99/ })).toBeVisible();

    // Receipt: charge and status from GET /requests/:id
    await reply.getByRole('button', { name: 'Receipt' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toContainText('Succeeded');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    // Second turn from the composer: the Send button carries the quoted price
    const message = page.getByLabel('Message');
    await message.fill('Make it two sentences shorter');
    await expect(page.getByRole('button', { name: /Send · \$0\./ })).toBeVisible({ timeout: 10_000 });
    await message.press('Enter');
    await expect(page.getByLabel('Assistant reply').nth(1).getByRole('button', { name: 'Receipt' })).toBeVisible({ timeout: 20_000 });

    // Wallet: the open deposit; a new deposit closes it first (no top-up in v1)
    await page.getByRole('button', { name: /Allocation: \$/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('Payment session');
    await expect(sheet).toContainText('demo@smartrouter.dev');
    await sheet.getByRole('button', { name: 'New deposit' }).click();
    const deposit = page.getByRole('dialog', { name: 'New deposit' });
    await deposit.getByRole('button', { name: '$5' }).click();
    await deposit.getByRole('button', { name: 'Deposit $5' }).click();
    await expect(deposit).toBeHidden();
    await expect(page.getByRole('button', { name: 'Wallet' })).toBeVisible();

    // Activity lists the runs
    await page.getByRole('link', { name: 'Activity' }).click();
    await page.waitForURL('**/activity');
    await expect(page.getByRole('list', { name: 'Requests' }).getByRole('listitem').first()).toBeVisible();
  });
});
