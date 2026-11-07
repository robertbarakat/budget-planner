#!/usr/bin/env bash
# Rigenera src/database.types.ts dallo schema del database locale (serve Docker e `supabase start`).
# Scrive su un file temporaneo e sostituisce l'originale solo se la generazione riesce.
set -euo pipefail
cd "$(dirname "$0")/../../database"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
npx supabase gen types typescript --local > "$tmp"
mv "$tmp" ../shared/src/database.types.ts
trap - EXIT
echo "Tipi rigenerati in shared/src/database.types.ts"
