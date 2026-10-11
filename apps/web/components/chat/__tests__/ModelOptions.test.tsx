import { fireEvent, render, screen } from '@testing-library/react';

import type { Option } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { ModelOptions } from '../ModelOptions';

const opt = (over: Partial<Option>): Option => ({ modelId: 'm', label: 'M', provider: 'P', quoteId: 'q', priceUsd: micro(900), speed: 'fast', reason: '80% of the best quality at 1/34 of the price', free: false, quality: 0.8, bestQuality: false, expiresAt: null, ...over });

describe('ModelOptions (PDF options list)', () => {
  it('renders the three recommended models plus the free option with price, speed, reason and attribution', () => {
    const onPick = vi.fn();
    render(
      <ModelOptions
        options={[opt({ modelId: 'a', label: 'GLM 5.3 Flash' }), opt({ modelId: 'b', label: 'DeepSeek V3', priceUsd: micro(1_100) }), opt({ modelId: 'c', label: 'Claude Opus 5.5', priceUsd: micro(26_000), bestQuality: true }), opt({ modelId: 'f', label: 'Free · Llama 3.1 8B', priceUsd: micro(0), free: true, reason: 'Free · 30 of 30 left today' })]}
        onPick={onPick}
      />,
    );
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Best quality')).toBeInTheDocument();
    expect(screen.getAllByText('Free').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$0.0009')).toBeInTheDocument();
    expect(screen.getByText('Quality data: LMArena, Artificial Analysis')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'GLM 5.3 Flash' }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'a' }));
  });

  it('toggles compare slots in compare mode', () => {
    const onToggle = vi.fn();
    render(<ModelOptions options={[opt({ modelId: 'a', label: 'A' })]} onPick={vi.fn()} compareMode compareIds={['a', null]} onCompareToggle={onToggle} />);
    const row = screen.getByRole('checkbox', { name: 'A' });
    expect(row).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith('a');
  });
});
