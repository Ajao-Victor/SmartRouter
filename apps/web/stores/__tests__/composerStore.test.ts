import { useComposerStore } from '../composerStore';

beforeEach(() => {
  useComposerStore.getState().reset();
});

describe('composerStore', () => {
  it('manages compare slots and reset', () => {
    useComposerStore.getState().setCompareModel(0, 'm1');
    useComposerStore.getState().setCompareModel(1, 'm2');
    expect(useComposerStore.getState().compareModelIds).toEqual(['m1', 'm2']);
    useComposerStore.getState().clearCompare();
    expect(useComposerStore.getState().compareModelIds).toEqual([null, null]);
    useComposerStore.getState().setDraft('hello');
    useComposerStore.getState().reset();
    expect(useComposerStore.getState().draft).toBe('');
  });

  it('holds the options returned by POST /chats until the workspace consumes them', () => {
    useComposerStore.getState().setPendingOptions({ chatId: 'c1', prompt: 'Write a poem', options: [] });
    expect(useComposerStore.getState().pendingOptions?.chatId).toBe('c1');
    useComposerStore.getState().setPendingOptions(null);
    expect(useComposerStore.getState().pendingOptions).toBeNull();
  });
});
