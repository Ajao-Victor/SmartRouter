#!/usr/bin/env bash
# CI gate for apps/web (rules.md §10): lint, typecheck, tests, provider-host guard, production build.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm lint
pnpm typecheck
pnpm test
pnpm guard:hosts
pnpm build
echo "ci: all checks passed"
