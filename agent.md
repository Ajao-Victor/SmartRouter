# agent.md — Operating rules for the AI agent building SmartRouter's frontend

You (the agent) are executing tasks from `Tasks.md` for the SmartRouter hackathon frontend. Read this file at the start of every session.

---

## 0. Context load order (every session)

1. `memory.md` — what is done, what was decided, open questions.
2. `Tasks.md` — find the next task with status `todo` (or the task the user names).
3. `rules.md` — coding standards.
4. `architecture.md` → `Technical_Requirements.md` → `design.md` — only the sections the task touches.
5. The PDF (`SmartRouter — Build Architecture 2.pdf`) is the **only** source of backend truth. If a task needs backend behaviour not in the PDF or the confirmed API contract, **stop and record the gap in `memory.md`**, then implement behind a typed adapter with a mock.

## 1. Non-negotiables

- **No Claude artifacts, no UI panels.** Write every file to disk with file tools. Never publish pages.
- **Atomic commits.** After each file (or tightly-coupled file pair) is saved: `git add <file> && git commit -m "<type>(web): <what>"`. Never aggregate a task into one commit. Conventional commits per `rules.md` §11.
- **No hallucinated backend.** Endpoints beyond `/run` are **proposed** (Technical_Requirements §5.2) until the user confirms. Keep them in `lib/api/endpoints.ts` behind one file so they can be swapped.
- **Money facts are the PDF's**: default allocation $2; fee 10% rounded up to $0.0001; quote valid 5 min; free model 30 msgs/day, 4,000/512 tokens; history cap 8,000 tokens; heartbeat 15 s; settle every $1 or hourly; idle close 24h; per-user cap $5/day; rate limit 30 req/min; slider presets Cheapest (0.2,0.7,0.1) / Balanced (0.45,0.4,0.15) / Best quality (0.8,0.1,0.1).
- **Copy strings are verbatim** where the PDF fixes them (see `UI_UX_Brief.md` §8).
- **Never** add auto top-up, direct provider calls, or key material in state.

## 2. Executing "execute task N"

1. Open `Tasks.md`, read task N completely, including *Files*, *State*, *Animations*, *Acceptance*.
2. Check `memory.md` for decisions that affect it.
3. Say in one line what you're about to do.
4. Create/modify files in the order listed. After each file: lint-think (types, imports, rules), save, **commit**.
5. Run `pnpm lint && pnpm typecheck && pnpm test` (and the task's specific test). Fix until green. Commit fixes atomically.
6. Update `Tasks.md`: set task N status to `done` and list the commit hashes. Commit: `docs: mark task N done`.
7. Update `memory.md` (Completed, Decisions, Open questions). Commit: `docs: update memory ledger after task N`.
8. Report: what was built, verification output, anything left out and why.

## 3. When something is missing

| Situation | Action |
|---|---|
| Endpoint shape unknown | Implement against the proposed contract; add a mock in `tests/mocks`; log the gap in `memory.md` §Open questions |
| Browser session/voucher package unknown | Code to `SessionClient` interface; ship `impl.mock.ts`; flag |
| Tempo SDK API differs from assumptions | Prefer the SDK's real API; update `Technical_Requirements.md` and `memory.md`; commit docs separately |
| Design conflict (performance vs effect) | Keep the effect behind reduced-motion + capability gate; never drop the fallback |
| Schedule pressure | Cut order from the PDF: Compare mode, then music. Feature flags exist for both |

## 4. Quality bar per file

- Strict TS, no `any`. Zod at boundaries.
- Component ≤ 250 lines, variants in `lib/motion/variants.ts`.
- Mobile-first classes first, then `md:`/`lg:`.
- `useReducedMotionSafe()` in any animated component.
- Tests for logic (money, SSE, stores) in the same commit as the logic.

## 5. Working style

- Do the work; don't ask permission for reversible steps inside a task.
- Ask only when two readings of a task produce materially different code **and** the PDF/contract can't settle it. Otherwise choose, state the assumption in `memory.md`, proceed.
- Prefer small, named helpers to clever one-liners. Future prompts will be "execute task N" — code must be self-explanatory.
- Keep terminal output in the final message short: outcome first, then verification, then gaps.

## 6. Prohibited

- Artifacts / published pages.
- Committing `.env*`, keys, or the PDF's private details.
- Adding dependencies not in `Technical_Requirements.md` without recording why in `memory.md`.
- Changing PDF-derived numbers or copy.
- Silent scope changes (cutting a sub-feature without noting it in `memory.md` and the report).

## 7. Session end checklist

- [ ] All files committed; `git status` clean
- [ ] `Tasks.md` statuses current
- [ ] `memory.md` updated and committed
- [ ] Final report lists commits (hash + message)
