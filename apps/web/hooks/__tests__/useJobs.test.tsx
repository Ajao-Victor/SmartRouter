import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useJobs } from '../useJobs';

const get = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({ api: { jobs: { get: (id: string) => get(id) as Promise<unknown> } } }));

describe('useJobs', () => {
  it('polls until the job is done and keys results by message id', async () => {
    let polls = 0;
    get.mockImplementation(() => {
      polls += 1;
      return Promise.resolve({ id: 'job_1', status: polls >= 2 ? 'done' : 'running', result_ref: polls >= 2 ? 'https://cdn.example.invalid/song.mp3' : null, error: null });
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useJobs([{ messageId: 'm1', jobId: 'job_1' }]), { wrapper });
    await waitFor(() => {
      expect(result.current.m1?.status).toBe('running');
    });
    await qc.refetchQueries({ queryKey: ['job', 'job_1'] });
    await waitFor(() => {
      expect(result.current.m1?.status).toBe('done');
    });
    expect(result.current.m1?.result_ref).toContain('song.mp3');
  });
});
