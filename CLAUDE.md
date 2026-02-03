# TaxBinder

A SaaS platform for CPA firms to manage tax document workflows. CPAs collect, organize, and process client tax documents using AI-powered OCR and intelligent document classification.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Full-stack web app |
| Database | Supabase (PostgreSQL) | Primary data store with Row-Level Security |
| Auth | Clerk | User authentication and identity |
| File Storage | Supabase Storage | Document file storage with RLS |
| Background Jobs | Inngest | Async OCR and AI processing |
| OCR | Azure Document Intelligence | Document text extraction |
| AI | Anthropic Claude (claude-sonnet-4-20250514) | Document classification and data extraction |
| UI | Radix UI + shadcn/ui + Tailwind CSS v4 | Component library and styling |
| State | TanStack React Query + Zustand | Server and client state management |
| Forms | React Hook Form + Zod | Form handling and validation |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth routes (login, signup)
│   ├── (dashboard)/               # Protected routes
│   │   ├── clients/               # Client management
│   │   │   └── [id]/              # Client detail page
│   │   ├── documents/             # Document library
│   │   ├── tasks/                 # Task management
│   │   ├── dashboard/             # Main dashboard
│   │   └── settings/              # App settings
│   ├── api/                       # API routes
│   │   ├── auth/sync/             # Clerk-to-Supabase user sync
│   │   ├── clients/               # Client CRUD
│   │   ├── documents/             # Document CRUD + upload + reprocess
│   │   ├── tasks/                 # Task CRUD
│   │   ├── dashboard/stats/       # Dashboard statistics
│   │   └── inngest/               # Inngest webhook handler
│   └── portal/                    # Client self-service portal
├── components/
│   ├── ui/                        # shadcn base components
│   ├── dashboard/                 # Sidebar, user sync guard
│   ├── clients/                   # Client list, client dialog
│   ├── documents/                 # Document list, viewer, upload dialog
│   └── tasks/                     # Task list, task dialog
├── hooks/                         # React Query hooks (use-clients, use-documents, use-tasks, etc.)
├── lib/
│   ├── ai/classifier.ts           # Claude AI document classification
│   ├── inngest/                   # Inngest client + workflow functions
│   ├── ocr/azure-document.ts      # Azure Document Intelligence OCR
│   └── supabase/                  # Browser and server Supabase clients
└── types/database.ts              # All TypeScript type definitions
```

### Database Migrations

```
supabase/migrations/
├── 001_initial_schema.sql         # Tables, indexes, triggers
├── 002_row_level_security.sql     # RLS policies, helper functions
└── 003_storage_buckets.sql        # Storage bucket + policies
```

## Database Schema

Seven main tables, all scoped by `organization_id` for multi-tenant isolation:

- **organizations** - CPA firms. Fields: name, slug, subscription_tier (free/pro/enterprise), settings (JSONB).
- **users** - Team members. Fields: clerk_id, email, name, role (admin/cpa/staff), organization_id.
- **clients** - Tax clients. Fields: name, email, phone, address, tax_year, filing_status, status (active/pending/completed/archived), assigned_to, portal_access_token.
- **documents** - Uploaded tax documents. Fields: client_id, file_url, file_name, file_size, mime_type, category, subcategory, tax_year, ocr_text, extracted_data (JSONB), status, uploaded_by, verified_by.
- **tasks** - Work items. Fields: client_id, title, description, status (pending/in_progress/review/completed), priority (low/medium/high/urgent), assigned_to, due_date.
- **audit_logs** - SOC 2 compliance. Fields: user_id, action, resource_type, resource_id, details (JSONB), ip_address.
- **document_checklists** / **client_checklist_progress** - Template checklists for document collection.

### Document Categories

income, deductions, expenses, banking, property, identity, other - each with specific subcategories (W-2, 1099-INT, 1099-DIV, 1098, etc.).

### Document Status Flow

```
pending_ocr → processing → pending_review → verified / rejected
```

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/auth/sync` | Sync Clerk user to Supabase (creates org + user on first login) |
| GET/POST | `/api/clients` | List/create clients |
| GET/PUT/DELETE | `/api/clients/[id]` | Get/update/delete client |
| GET/POST | `/api/documents` | List/create documents |
| POST | `/api/documents/upload` | Upload file to storage + create record + trigger processing |
| GET/PUT/DELETE | `/api/documents/[id]` | Get/update/delete document |
| GET | `/api/documents/[id]/url` | Get signed URL for file download (1-hour expiry) |
| POST | `/api/documents/[id]/reprocess` | Re-trigger OCR + AI classification |
| GET/POST | `/api/tasks` | List/create tasks |
| GET/PUT/DELETE | `/api/tasks/[id]` | Get/update/delete task |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| POST | `/api/inngest` | Inngest webhook handler |

## Key Workflows

### Document Processing Pipeline (Inngest)

1. User uploads file via `/api/documents/upload`
2. File saved to Supabase Storage, document record created with status `pending_ocr`
3. Inngest event `document/uploaded` triggered
4. Background job runs:
   - Azure OCR extracts text, tables, key-value pairs
   - Claude AI classifies document (category, subcategory, confidence, tax year)
   - Claude extracts form-specific fields (W-2 boxes, 1099 fields, etc.)
5. Document updated with OCR text + extracted_data JSONB, status set to `pending_review`
6. CPA reviews and verifies or rejects

Three Inngest functions: `processDocument` (3 retries), `reprocessDocument` (2 retries), `bulkProcessDocuments` (1 retry).

### Authentication Flow

1. Clerk handles signup/login (OAuth, email/password)
2. On first login, `UserSyncGuard` component calls `POST /api/auth/sync`
3. Backend creates organization + admin user in Supabase
4. All subsequent API calls: Clerk middleware validates token, API routes look up organization_id, all queries scoped by org

### Multi-Tenant Architecture

- All data scoped by `organization_id`
- RLS policies enforce data isolation at the database level
- Helper functions: `get_user_organization_id()`, `is_org_admin()`
- Storage paths: `{organization_id}/{client_id}/{timestamp}-{filename}`

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Azure Document Intelligence (OCR)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=

# Anthropic Claude (AI Classification)
ANTHROPIC_API_KEY=

# Inngest (Background Jobs)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Important Files

**Core:**
- `src/app/layout.tsx` - Root layout with Clerk provider
- `src/middleware.ts` - Clerk auth middleware (public vs protected routes)
- `src/types/database.ts` - All TypeScript interfaces and type definitions

**Business Logic:**
- `src/lib/inngest/functions.ts` - Document processing workflows (OCR + AI)
- `src/lib/ai/classifier.ts` - Claude AI classification and data extraction
- `src/lib/ocr/azure-document.ts` - Azure Document Intelligence integration
- `src/lib/supabase/server.ts` - Server-side Supabase client (service role)
- `src/lib/supabase/client.ts` - Browser-side Supabase client

**API:**
- `src/app/api/documents/upload/route.ts` - File upload handler
- `src/app/api/auth/sync/route.ts` - User/org sync endpoint

**Hooks:**
- `src/hooks/use-documents.ts` - Document CRUD + upload + signed URLs
- `src/hooks/use-clients.ts` - Client management
- `src/hooks/use-tasks.ts` - Task management
- `src/hooks/use-user-sync.ts` - Auth sync check

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).
