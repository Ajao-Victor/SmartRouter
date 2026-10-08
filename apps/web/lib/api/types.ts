// TEMP until the shared types package is wired (Backend_Gaps_Report §4; memory.md).
// Shapes mirror the "Core tables" in SmartRouter — Build Architecture 2.pdf.
// When `@smartrouter/shared` lands, replace this file with `export * from '@smartrouter/shared'`.

import { z } from 'zod';

import { micro, type MicroUsd } from '@/lib/money';

/* ---------------------------------- primitives --------------------------------- */

/** Integer micro-USD from the API, branded on parse. */
export const microSchema = z
  .number()
  .int()
  .transform((n): MicroUsd => micro(n));

export const taskTypeSchema = z.enum([
  'chat',
  'writing',
  'coding',
  'research',
  'translation',
  'image',
  'music',
]);
export type TaskType = z.infer<typeof taskTypeSchema>;
export const TASK_TYPES = taskTypeSchema.options;

/** Slider presets (PDF weights q,p,s): cheapest (0.2,0.7,0.1) · balanced (0.45,0.4,0.15) · best (0.8,0.1,0.1). */
export const sliderPresetSchema = z.enum(['cheapest', 'balanced', 'best']);
export type SliderPreset = z.infer<typeof sliderPresetSchema>;

export const SLIDER_WEIGHTS: Record<SliderPreset, { quality: number; price: number; speed: number }> =
  {
    cheapest: { quality: 0.2, price: 0.7, speed: 0.1 },
    balanced: { quality: 0.45, price: 0.4, speed: 0.15 },
    best: { quality: 0.8, price: 0.1, speed: 0.1 },
  };

export const complexitySchema = z.enum(['short', 'long']);
export type Complexity = z.infer<typeof complexitySchema>;

/** PDF `models.payment`: charge | session | free. */
export const paymentKindSchema = z.enum(['charge', 'session', 'free']);
export type PaymentKind = z.infer<typeof paymentKindSchema>;

const isoDate = z.string().datetime({ offset: true });

/* ------------------------------------ users ------------------------------------ */

export const userSchema = z.object({
  id: z.string(),
  tempo_address: z.string(),
  country: z.string().nullable(),
  slider: sliderPresetSchema,
  /** Allocation size (PDF default $2). */
  allocation: microSchema,
  /** Spending limit (PDF example $10/week). */
  weekly_limit: microSchema,
  auto_free_fallback: z.boolean(),
});
export type User = z.output<typeof userSchema>;

export const settingsPatchSchema = z
  .object({
    slider: sliderPresetSchema,
    allocation: z.number().int().positive(),
    weekly_limit: z.number().int().positive(),
    auto_free_fallback: z.boolean(),
  })
  .partial();
export type SettingsPatch = z.input<typeof settingsPatchSchema>;

/* ------------------------------------ models ----------------------------------- */

/**
 * Catalog entry. The PDF table also has `mpp_url`; the frontend never needs provider
 * endpoints (security.md §4), so it is intentionally absent here.
 */
export const modelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model_name: z.string(),
  label: z.string(),
  adapter: z.string(),
  payment: paymentKindSchema,
  task_types: z.array(taskTypeSchema),
  quality_by_task: z.record(taskTypeSchema, z.number()).default({}),
  price_est: microSchema,
  /** Median latency in ms over the last 7 days (PDF), null when unmeasured. */
  latency: z.number().nullable(),
  verified: z.boolean(),
  active: z.boolean(),
});
export type Model = z.output<typeof modelSchema>;

/* ------------------------------------ chats ------------------------------------ */

export const chatSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  /** Written by the free model after the first reply (PDF) — untrusted text. */
  title: z.string().nullable(),
  task_type: taskTypeSchema,
  slider: sliderPresetSchema,
  current_model_id: z.string().nullable(),
  /** Running summary of folded older turns (PDF) — untrusted text. */
  summary: z.string().nullable(),
  message_count: z.number().int().nonnegative(),
  spent: microSchema,
  created_at: isoDate,
  updated_at: isoDate,
});
export type Chat = z.output<typeof chatSchema>;

export const attachmentSchema = z.object({
  url: z.string().url(),
  mime: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative(),
});
export type Attachment = z.output<typeof attachmentSchema>;

export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageStatusSchema = z.enum(['pending', 'streaming', 'done', 'error']);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const messageSchema = z.object({
  id: z.string(),
  chat_id: z.string(),
  seq: z.number().int().nonnegative(),
  role: messageRoleSchema,
  content: z.string(),
  attachments: z.array(attachmentSchema).default([]),
  /** Which model wrote this reply (PDF: each reply records its model). */
  model_id: z.string().nullable(),
  request_id: z.string().nullable(),
  /** Object-storage reference for images/songs. */
  result_ref: z.string().nullable(),
  tokens: z.number().int().nullable(),
  status: messageStatusSchema,
  created_at: isoDate,
});
export type Message = z.output<typeof messageSchema>;

export const chatWithMessagesSchema = chatSchema.extend({
  messages: z.array(messageSchema),
});
export type ChatWithMessages = z.output<typeof chatWithMessagesSchema>;

export const createChatInputSchema = z
  .object({
    task_type: taskTypeSchema,
    first_prompt: z.string().min(1),
  })
  .partial();
export type CreateChatInput = z.input<typeof createChatInputSchema>;

/* ------------------------------ quotes & recommendations ----------------------- */

export const quoteSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  chat_id: z.string(),
  model_id: z.string(),
  prompt_hash: z.string(),
  context_tokens: z.number().int().nonnegative(),
  /** User price = provider cost + fee, rounded up to $0.0001 (PDF). */
  price: microSchema,
  est_cost: microSchema,
  /** Valid for 5 minutes (PDF). */
  expires_at: isoDate,
});
export type Quote = z.output<typeof quoteSchema>;

export const classificationSchema = z.object({
  task_type: taskTypeSchema,
  complexity: complexitySchema,
  language: z.string(),
  needs_web: z.boolean(),
});
export type Classification = z.output<typeof classificationSchema>;

/** One of the four options the PDF shows: top 2 by score, best quality, free. */
export const recommendationSchema = z.object({
  model_id: z.string(),
  label: z.string(),
  provider: z.string(),
  price: microSchema,
  speed_label: z.string(),
  /** One-line reason, e.g. "80% of the best quality at 1/34 of the price". Display verbatim. */
  reason: z.string(),
  score: z.number(),
  quality: z.number(),
  is_free: z.boolean(),
  is_best_quality: z.boolean(),
  searches_web: z.boolean().default(false),
  /** Quote for this exact model + prompt; null for the free model. */
  quote_id: z.string().nullable(),
});
export type Recommendation = z.output<typeof recommendationSchema>;

export const suggestionSchema = z.object({
  model_id: z.string(),
  task_type: taskTypeSchema,
  reason: z.string(),
});
export type Suggestion = z.output<typeof suggestionSchema>;

export const quoteResponseSchema = z.object({
  classification: classificationSchema,
  recommendations: z.array(recommendationSchema),
  /** Quote for the current/selected model. */
  quote: quoteSchema,
  /** "Suggest, never force" (PDF). */
  suggestion: suggestionSchema.nullable().default(null),
});
export type QuoteResponse = z.output<typeof quoteResponseSchema>;

export const quoteInputSchema = z.object({
  prompt: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
  model_id: z.string().optional(),
  slider: sliderPresetSchema.optional(),
});
export type QuoteInput = z.input<typeof quoteInputSchema>;

/* ---------------------------------- sessions ----------------------------------- */

export const sessionStatusSchema = z.enum(['open', 'closed']);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const userSessionSchema = z.object({
  channel_id: z.string(),
  user_id: z.string(),
  authorized_signer: z.string(),
  deposit: microSchema,
  highest_voucher: microSchema,
  counted: microSchema,
  settled: microSchema,
  last_used_at: isoDate.nullable(),
  status: sessionStatusSchema,
});
export type UserSession = z.output<typeof userSessionSchema>;

export const registerSessionInputSchema = z.object({
  channel_id: z.string(),
  authorized_signer: z.string(),
});
export type RegisterSessionInput = z.input<typeof registerSessionInputSchema>;

/* ------------------------------ requests & receipts ---------------------------- */

export const requestStatusSchema = z.enum(['pending', 'running', 'retrying', 'done', 'failed']);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const requestReceiptSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  quote_id: z.string().nullable(),
  chat_id: z.string(),
  channel_id: z.string().nullable(),
  model_id: z.string(),
  is_free: z.boolean(),
  price: microSchema,
  provider_cost: microSchema.nullable(),
  latency_ms: z.number().int().nullable(),
  provider_receipt: z.string().nullable(),
  status: requestStatusSchema,
  voucher_amount: microSchema.nullable(),
  /** Appears only after settlement (PDF: every $1 or hourly). */
  tx_hash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .nullable(),
  created_at: isoDate,
});
export type RequestReceipt = z.output<typeof requestReceiptSchema>;

/* ------------------------------------- jobs ------------------------------------ */

export const jobStatusSchema = z.enum(['queued', 'running', 'done', 'failed']);
export const jobSchema = z.object({
  id: z.string(),
  status: jobStatusSchema,
  result_ref: z.string().nullable(),
  error: z.string().nullable(),
});
export type Job = z.output<typeof jobSchema>;

/* ---------------------------------- free usage --------------------------------- */

export const freeUsageSchema = z.object({
  messages: z.number().int().nonnegative(),
  /** PDF: 30 messages per user per day. */
  limit: z.number().int().positive().default(30),
});
export type FreeUsage = z.output<typeof freeUsageSchema>;
export const FREE_MESSAGES_PER_DAY = 30;

/* ---------------------------------- feedback ----------------------------------- */

export const feedbackInputSchema = z.object({
  message_id: z.string(),
  vote: z.enum(['up', 'down']),
});
export type FeedbackInput = z.input<typeof feedbackInputSchema>;

export const compareVoteInputSchema = z.object({
  chat_id: z.string(),
  left_request_id: z.string(),
  right_request_id: z.string(),
  pick: z.enum(['left', 'right']),
});
export type CompareVoteInput = z.input<typeof compareVoteInputSchema>;

/* ---------------------------------- waitlist ----------------------------------- */

export const waitlistInputSchema = z.object({
  email: z.string().email(),
  country: z.string().length(2),
  interest: z.enum(['naira', 'credits']),
});
export type WaitlistInput = z.input<typeof waitlistInputSchema>;

/* ------------------------------------- auth ------------------------------------ */

export const nonceSchema = z.object({ nonce: z.string().min(8) });

export const verifyInputSchema = z.object({
  message: z.string(),
  signature: z.string(),
  kind: z.enum(['passkey', 'wallet']),
});
export type VerifyInput = z.input<typeof verifyInputSchema>;

export const authResponseSchema = z.object({ user: userSchema });

/* -------------------------------------- run ------------------------------------ */

/** Signed cumulative session voucher (format unconfirmed — Backend_Gaps_Report §3.2). */
export const voucherSchema = z.object({
  channel_id: z.string(),
  cumulative_amount: z.number().int().nonnegative(),
  signature: z.string(),
});
export type Voucher = z.input<typeof voucherSchema>;

export const runInputSchema = z.object({
  quote_id: z.string().nullable(),
  chat_id: z.string(),
  model_id: z.string(),
  /** Omitted on free-model turns (PDF: free turns skip payment). */
  voucher: voucherSchema.optional(),
});
export type RunInput = z.input<typeof runInputSchema>;
