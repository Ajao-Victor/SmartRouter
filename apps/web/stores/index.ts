import { useAllocationStore } from '@/stores/allocationStore';
import { useComposerStore } from '@/stores/composerStore';
import { useStreamStore } from '@/stores/streamStore';
import { useUiStore } from '@/stores/uiStore';
import { useWalletStore } from '@/stores/walletStore';

export { useAllocationStore } from '@/stores/allocationStore';
export { useComposerStore } from '@/stores/composerStore';
export { useStreamStore } from '@/stores/streamStore';
export { useUiStore } from '@/stores/uiStore';
export { useWalletStore } from '@/stores/walletStore';

/** Logout: clear every client store (rules.md §4.7). Persisted preferences survive. */
export function resetAllStores(): void {
  useStreamStore.getState().clearAll();
  useComposerStore.getState().reset();
  useAllocationStore.getState().reset();
  useWalletStore.getState().reset();
  useUiStore.getState().reset();
}
