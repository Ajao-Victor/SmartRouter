import { MockTempoAccounts } from '../mock';
import { buildSiweMessage, signInWithEthereum } from '../siwe';

const nonce = vi.fn();
const verify = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({
  api: { auth: { nonce: () => nonce() as Promise<unknown>, verify: (i: unknown) => verify(i) as Promise<unknown> } },
}));

describe('SIWE', () => {
  it('builds an EIP-4361 message', () => {
    const msg = buildSiweMessage({
      domain: 'smartrouter.app',
      address: '0xabc',
      uri: 'https://smartrouter.app',
      nonce: 'n0nce123',
      chainId: 4217,
      issuedAt: '2026-10-08T00:00:00.000Z',
      statement: 'Sign in to SmartRouter.',
    });
    expect(msg.split('\n')[0]).toBe('smartrouter.app wants you to sign in with your Ethereum account:');
    expect(msg).toContain('Chain ID: 4217');
    expect(msg).toContain('Nonce: n0nce123');
    expect(msg).toContain('Sign in to SmartRouter.');
  });

  it('runs nonce → sign → verify with the adapter', async () => {
    nonce.mockResolvedValue({ nonce: 'abcdefgh' });
    verify.mockResolvedValue({ user: { id: 'u_demo' } });
    const tempo = new MockTempoAccounts(0);
    const account = await tempo.signIn();
    const user = await signInWithEthereum(tempo, account);
    expect(user).toEqual({ id: 'u_demo' });
    const call = verify.mock.calls[0]?.[0] as { message: string; signature: string; kind: string };
    expect(call.kind).toBe('passkey');
    expect(call.signature).toMatch(/^0xmock/);
    expect(call.message).toContain(account.address);
  });

  it('mock adapter flags dialogs open and closed around sign-in', async () => {
    const tempo = new MockTempoAccounts(0);
    const states: boolean[] = [];
    tempo.onDialog((o) => states.push(o));
    await tempo.signIn();
    expect(states).toEqual([true, false]);
  });
});
