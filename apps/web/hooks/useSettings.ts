'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { SettingsPatch, User } from '@/lib/api/types';

/** PATCH `/api/me/settings` (proposed): allocation, weekly limit, slider default, auto free fallback. */
export function useSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.me.updateSettings(patch),
    onSuccess: (user: User) => {
      qc.setQueryData(queryKeys.me(), user);
      void qc.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}
