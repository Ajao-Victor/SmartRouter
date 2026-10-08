'use client';

import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import type { CompareVoteInput, FeedbackInput } from '@/lib/api/types';

/** Thumbs up/down feed the recommendation engine (PDF lifecycle step 11). */
export function useFeedback() {
  return useMutation({ mutationFn: (input: FeedbackInput) => api.feedback.vote(input) });
}

/** Compare picks are recorded as compare votes (PDF). */
export function useCompareVote() {
  return useMutation({ mutationFn: (input: CompareVoteInput) => api.feedback.compare(input) });
}
