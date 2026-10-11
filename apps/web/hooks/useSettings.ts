'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { Settings, SettingsPatch, User } from '@/lib/api/types';

/** `PATCH /me/settings { slider?, allocationUsd?, weeklyLimitUsd?, autoFreeFallback? }` — answers with the settings, merged into `/me`. */
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
