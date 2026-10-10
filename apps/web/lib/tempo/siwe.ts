/**
 * Sign-in (PDF "Wallet and sign-in"): `POST /auth/challenge { address, origin }` → SIWE message
 * with a one-time nonce → the wallet signs it exactly as returned → `POST /auth/verify
 * { message, signature }` sets the 7-day `sr_session` cookie.
 */
import { api } from '@/lib/api/endpoints';

export interface MessageSigner {
  address: string;
  signMessage: (args: { message: string }) => Promise<string>;
}

export async function signInWithWallet(signer: MessageSigner): Promise<void> {
  const origin = typeof window === 'undefined' ? 'https://smartrouter' : window.location.origin;
  const { message } = await api.auth.challenge({ address: signer.address, origin });
  const signature = await signer.signMessage({ message });
  await api.auth.verify({ message, signature });
}
