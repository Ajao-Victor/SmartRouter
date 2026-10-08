import { MAX_ATTACHMENTS, MAX_UPLOAD_BYTES, useComposerStore } from '../composerStore';

function file(name: string, type: string, size = 10): File {
  const f = new File([new Uint8Array(size)], name, { type });
  return f;
}

beforeEach(() => {
  useComposerStore.getState().reset();
});

describe('composerStore attachments', () => {
  it('accepts allowlisted types and rejects others', () => {
    expect(useComposerStore.getState().addAttachment(file('a.png', 'image/png'))).toBeNull();
    expect(useComposerStore.getState().addAttachment(file('x.exe', 'application/x-msdownload'))).toBe('type');
    expect(useComposerStore.getState().attachments).toHaveLength(1);
  });

  it('rejects oversized files', () => {
    const big = { name: 'big.pdf', type: 'application/pdf', size: MAX_UPLOAD_BYTES + 1 } as File;
    expect(useComposerStore.getState().addAttachment(big)).toBe('size');
  });

  it('caps the number of attachments', () => {
    for (let i = 0; i < MAX_ATTACHMENTS; i += 1) {
      expect(useComposerStore.getState().addAttachment(file(`${String(i)}.txt`, 'text/plain'))).toBeNull();
    }
    expect(useComposerStore.getState().addAttachment(file('extra.txt', 'text/plain'))).toBe('count');
  });

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
});
