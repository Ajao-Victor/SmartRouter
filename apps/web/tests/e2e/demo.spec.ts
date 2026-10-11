import { expect, test } from '@playwright/test';

/**
 * PDF demo path on mocks: sign in → describe the task → quoted options → run → streamed answer
 * with charge and receipt → wallet shows the session → top-up → activity.
 * Runs against `NEXT_PUBLIC_MOCK=1 next dev` (playwright.config webServer).
 */
test.describe('demo path', () => {
  test('sign in → describe → pick a model → answer → receipt → top-up → activity', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tell SmartRouter what you want done');

    // Sign in (mock passkey → SIWE challenge/verify → cookie) → app
    await page.getByRole('button', { name: 'Sign in with passkey' }).click();
    await page.waitForURL('**/chat');

    // Describe the task → POST /chats returns the quoted options
    await page.getByLabel('Describe the task').fill('Write a short cover letter for a payments engineer role at Paystack');
    await page.getByRole('button', { name: 'Get options' }).click();
    await page.waitForURL('**/chat/**');
    const options = page.getByRole('option');
    await expect(options).toHaveCount(4);
    await expect(page.getByText('Quality data: LMArena, Artificial Analysis').first()).toBeVisible();
    await expect(page.getByRole('option', { name: 'Free · Llama 3.1 8B' })).toBeVisible();

    // Pick the recommended model → POST /run streams the answer; the first paid run opens the $2 session
    await options.first().click();
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

    // Wallet: the payment session and a user-initiated top-up (never automatic)
    await page.getByRole('button', { name: /Allocation: \$/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('Payment session');
    await sheet.getByRole('button', { name: 'Top up $2' }).click();
    await expect(page.getByText('Topped up')).toBeVisible();
    await expect(sheet).toContainText('$4.00');
    await page.keyboard.press('Escape');

    // Activity lists the runs
    await page.getByRole('link', { name: 'Activity' }).click();
    await page.waitForURL('**/activity');
    await expect(page.getByRole('list', { name: 'Requests' }).getByRole('listitem').first()).toBeVisible();
  });
});
