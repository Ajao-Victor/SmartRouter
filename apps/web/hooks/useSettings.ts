'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { Settings, SettingsPatch, User } from '@/lib/api/types';

/**
 * `PATCH /me/settings { slider?, allocationUsd?, weeklyLimitUsd?, autoFreeFallback?, country? }`.
 * The reply is the settings object; it is merged into the cached user. A new weekly limit or
 * deposit changes the banner, so `/me` and `/sessions/current` are refreshed.
 */
export function useSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.me.updateSettings(patch),
    onSuccess: (settings: Settings) => {
      qc.setQueryData<User>(queryKeys.me(), (prev) => (prev ? { ...prev, ...settings } : prev));
      void qc.invalidateQueries({ queryKey: queryKeys.me() });
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
    },
  });
}
