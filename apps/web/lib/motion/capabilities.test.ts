import { canUseWebGL, probeCapabilities, resetCapabilityCache } from './capabilities';

describe('capabilities', () => {
  afterEach(() => {
    resetCapabilityCache();
  });

  it('reports no WebGL in jsdom and gates the layer off', () => {
    const report = probeCapabilities();
    expect(report.webgl2).toBe(false);
    expect(report.ok).toBe(false);
    expect(canUseWebGL()).toBe(false);
  });

  it('memoises the result until reset', () => {
    expect(canUseWebGL()).toBe(false);
    resetCapabilityCache();
    expect(canUseWebGL()).toBe(false);
  });
});
