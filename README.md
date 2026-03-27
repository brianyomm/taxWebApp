# TaxBinder

TaxBinder is a multi-tenant tax workflow app for CPA teams built with Next.js, Clerk, Supabase, Inngest, and AI-assisted document processing.

## Stack

- Next.js (App Router) + React + TypeScript
- Clerk authentication
- Supabase Postgres + Storage
- Inngest background jobs
- Azure Document Intelligence (OCR)
- Anthropic Claude (classification/extraction)

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase project
- Clerk project
- (Optional) Azure Document Intelligence
- (Optional) Anthropic API key

## Environment

Copy `.env.example` to `.env.local` and fill values.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For AI/OCR features:

- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- `ANTHROPIC_API_KEY`

## Local Setup

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Database Migrations

Run SQL migrations in order in Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_row_level_security.sql`
3. `supabase/migrations/003_storage_buckets.sql`
4. `supabase/migrations/004_document_status_and_notes.sql`

## Scripts

- `npm run dev`: start development server
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript checks
- `npm run test`: lightweight schema consistency checks
- `npm run check`: typecheck + lint

## Notes

- API routes use Supabase service role and enforce tenant scoping in code.
- Document uploads are restricted to approved MIME types and a 15MB max file size.
- Document processing failures are now recorded with `status = "error"` and metadata in `extracted_data.processingErrors`.
