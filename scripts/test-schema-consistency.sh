#!/usr/bin/env bash
set -euo pipefail

echo "Running schema consistency checks..."

if ! rg -q "processing" supabase/migrations/004_document_status_and_notes.sql; then
  echo "Expected 'processing' status in migration."
  exit 1
fi

if ! rg -q "error" supabase/migrations/004_document_status_and_notes.sql; then
  echo "Expected 'error' status in migration."
  exit 1
fi

if ! rg -q "notes\\?: string;" src/types/database.ts; then
  echo "Expected optional document notes in TypeScript types."
  exit 1
fi

if ! rg -q "offset: number;" src/types/database.ts; then
  echo "Expected offset-based pagination contract in TypeScript types."
  exit 1
fi

echo "Schema consistency checks passed."
