import { act, render, screen, waitFor } from '@testing-library/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { useUiStore } from '@/stores/uiStore';

import { PreferencesProvider } from './PreferencesProvider';

function Probe() {
  const reduced = useReducedMotionSafe();
  return <span data-testid="probe">{reduced ? 'reduced' : 'full'}</span>;
}

beforeEach(() => {
  useUiStore.setState({ theme: 'dark', forceReducedMotion: false, hydrated: false });
  document.documentElement.dataset.theme = 'dark';
});

describe('PreferencesProvider', () => {
  it('marks the store hydrated after mount without IndexedDB', async () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );
    await waitFor(() => {
      expect(useUiStore.getState().hydrated).toBe(true);
    });
  });

  it('feeds the app reduced-motion toggle into the motion provider', async () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('full');
    act(() => {
      useUiStore.getState().setForceReducedMotion(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('reduced');
    });
  });

  it('applies the theme to <html data-theme>', async () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    );
    act(() => {
      useUiStore.getState().setTheme('light');
    });
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });
});
