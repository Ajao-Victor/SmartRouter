/**
 * The user's Privy embedded wallet, exposed to non-React code (the mppx session). The Privy
 * bridge (`components/auth/AuthProvider`) registers a getter over `useWallets()`; payments read it
 * with `getPrivyWallet()` (Handover: `wallets.find((w) => w.walletClientType === 'privy')`).
 */
export interface EmbeddedWallet {
  address: string;
  walletClientType: string;
  getEthereumProvider: () => Promise<unknown>;
  switchChain?: (chainId: number) => Promise<void>;
}

let getter: (() => readonly EmbeddedWallet[]) | null = null;

export function registerPrivyWallets(fn: (() => readonly EmbeddedWallet[]) | null): void {
  getter = fn;
}

export function getPrivyWallet(): EmbeddedWallet | null {
  return getter?.().find((w) => w.walletClientType === 'privy') ?? null;
}
