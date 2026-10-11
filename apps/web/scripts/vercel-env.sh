#!/usr/bin/env bash
# Push the five public variables from "SmartRouter Frontend Architecture" (Vercel environment
# variables, p. 3) to the linked Vercel project. Production = mainnet, Preview (staging branch) =
# testnet. Everything here is public (NEXT_PUBLIC_*), so nothing sensitive is stored.
#
# Usage, from the repo root after `npx vercel link` (root directory apps/web):
#   bash apps/web/scripts/vercel-env.sh                       # Heroku API URLs until custom domains exist
#   API_PROD=https://api.example.com API_STAGING=https://api-staging.example.com bash apps/web/scripts/vercel-env.sh
set -euo pipefail

API_PROD="${API_PROD:-https://smartrouter-mainnet-9d3c469b9ffd.herokuapp.com}"
API_STAGING="${API_STAGING:-https://smartrouter-testnet-8f580f845259.herokuapp.com}"
STAGING_BRANCH="${STAGING_BRANCH:-staging}"
# Handover: one Privy app for both networks (public id, not the secret).
PRIVY_APP_ID="${PRIVY_APP_ID:-cmv3ikdu600ml0fl9xtzfhbvh}"

add() { # name value environment [git-branch]
  local name="$1" value="$2" env="$3" branch="${4:-}"
  # Replace an existing value so the script is safe to re-run.
  npx vercel env rm "$name" "$env" ${branch:+"$branch"} --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$name" "$env" ${branch:+"$branch"}
}

echo "== Production (main → Tempo mainnet, chain 4217)"
add NEXT_PUBLIC_API_URL       "$API_PROD"                 production
add NEXT_PUBLIC_TEMPO_NETWORK "tempo"                     production
add NEXT_PUBLIC_CHAIN_ID      "4217"                      production
add NEXT_PUBLIC_RPC_URL       "https://rpc.tempo.xyz"     production
add NEXT_PUBLIC_PRIVY_APP_ID  "$PRIVY_APP_ID"             production

echo "== Preview / staging ($STAGING_BRANCH → Tempo Moderato testnet, chain 42431)"
add NEXT_PUBLIC_API_URL       "$API_STAGING"                       preview "$STAGING_BRANCH"
add NEXT_PUBLIC_TEMPO_NETWORK "moderato"                           preview "$STAGING_BRANCH"
add NEXT_PUBLIC_CHAIN_ID      "42431"                              preview "$STAGING_BRANCH"
add NEXT_PUBLIC_RPC_URL       "https://rpc.moderato.tempo.xyz"     preview "$STAGING_BRANCH"
add NEXT_PUBLIC_PRIVY_APP_ID  "$PRIVY_APP_ID"                      preview "$STAGING_BRANCH"

echo
echo "Done. Verify with: npx vercel env ls"
echo "Never add NEXT_PUBLIC_MOCK on Vercel, and never a dRPC key URL in NEXT_PUBLIC_RPC_URL."
