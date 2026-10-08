import {
  applyFee,
  clampMicro,
  formatUsd,
  fromUsd,
  micro,
  pct,
  ratioLabel,
  roundUpToTenThousandth,
  savingLine,
  sumMicro,
  toUsd,
} from './money';

describe('micro / fromUsd / toUsd', () => {
  it('brands integers and rejects non-integers', () => {
    expect(micro(800)).toBe(800);
    expect(() => micro(0.5)).toThrow(TypeError);
    expect(() => micro(Number.NaN)).toThrow(TypeError);
  });

  it('converts USD both ways', () => {
    expect(fromUsd(2)).toBe(2_000_000);
    expect(fromUsd(0.0008)).toBe(800);
    expect(toUsd(micro(26_000))).toBeCloseTo(0.026);
  });
});

describe('roundUpToTenThousandth (PDF: rounded up to $0.0001)', () => {
  it('rounds up to the next 100 micro', () => {
    expect(roundUpToTenThousandth(micro(801))).toBe(900);
    expect(roundUpToTenThousandth(micro(800))).toBe(800);
    expect(roundUpToTenThousandth(micro(1))).toBe(100);
    expect(roundUpToTenThousandth(micro(0))).toBe(0);
  });
});

describe('applyFee (provider cost + 10%, rounded up)', () => {
  it('adds the fee and rounds up', () => {
    // $0.0008 + 10% = $0.00088 → rounds up to $0.0009
    expect(applyFee(micro(800))).toBe(900);
    // $0.026 + 10% = $0.0286 → exact on the $0.0001 grid
    expect(applyFee(micro(26_000))).toBe(28_600);
    // custom fee
    expect(applyFee(micro(10_000), 0)).toBe(10_000);
  });
});

describe('formatUsd', () => {
  it('shows PDF-style prices', () => {
    expect(formatUsd(micro(800))).toBe('$0.0008');
    expect(formatUsd(micro(26_000))).toBe('$0.026');
    expect(formatUsd(micro(2_000_000))).toBe('$2.00');
    expect(formatUsd(micro(700))).toBe('$0.0007');
    expect(formatUsd(micro(200))).toBe('$0.0002');
  });

  it('respects min/max and symbol', () => {
    expect(formatUsd(micro(2_000_000), { min: 0 })).toBe('$2');
    expect(formatUsd(micro(123_456), { max: 2 })).toBe('$0.12');
    expect(formatUsd(micro(999_999), { max: 2 })).toBe('$1.00');
    expect(formatUsd(micro(1_500_000), { symbol: '' })).toBe('1.50');
  });

  it('handles negatives', () => {
    expect(formatUsd(micro(-800))).toBe('-$0.0008');
  });
});

describe('ratios and saving line', () => {
  it('floors the price ratio', () => {
    // PDF quotes 1/34 from live Oct 7 data; our floor of $0.026/$0.0008 is 1/32.
    // The API's `reason` string is authoritative when present.
    expect(ratioLabel(micro(800), micro(26_000))).toBe('1/32');
    expect(ratioLabel(micro(0), micro(26_000))).toBe('free');
    expect(ratioLabel(micro(26_000), micro(800))).toBe('1/1');
  });

  it('builds the PDF saving pattern', () => {
    expect(savingLine(80, '1/34')).toBe('80% of the best quality at 1/34 of the price');
  });

  it('pct rounds and guards zero', () => {
    expect(pct(4, 5)).toBe(80);
    expect(pct(1, 0)).toBe(0);
  });
});

describe('sumMicro / clampMicro', () => {
  it('sums and clamps', () => {
    expect(sumMicro([micro(100), micro(250)])).toBe(350);
    expect(clampMicro(micro(-5), micro(100))).toBe(0);
    expect(clampMicro(micro(500), micro(100))).toBe(100);
  });
});
