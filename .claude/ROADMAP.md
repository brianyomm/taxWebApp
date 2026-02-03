# TaxBinder: Feature Roadmap

## Current State (Phase 1 MVP - Complete)

- Client CRUD, document upload/OCR/AI classification, task management, basic dashboard
- Auth (Clerk), multi-tenancy (Supabase RLS), audit logging, background jobs (Inngest)
- Stubbed but unimplemented: client portal (empty directory), settings tabs (placeholders), document checklists (DB tables exist, no UI/API)

---

## Phase 2: Core CPA Workflow Gaps (High Priority)

### 1. Client Portal

**Why:** Clients need a self-service way to upload documents, view requests, and check status. Every competitor (TaxDome, Canopy, SmartVault) has this. The DB already has `portal_access_token` and `portal_access_expires` on the clients table.

**Scope:**

- Token-based portal login (no Clerk account required for clients)
- Document upload from client side
- View document checklist / requested items
- Status visibility (what's been received, what's pending)
- Mobile-responsive design
- Custom branding per organization

### 2. Document Checklists & Organizers

**Why:** CPAs need to tell clients exactly which documents to submit. This is one of the most time-consuming parts of tax season. DB tables (`document_checklists`, `client_checklist_progress`) already exist but have zero UI or API.

**Scope:**

- Checklist template CRUD (reusable per org)
- Assign checklists to clients
- Track per-client progress (which items received)
- Client portal integration (clients see what they still need to submit)
- Automated reminders for missing items

### 3. Multi-Year Client Support

**Why:** The current system tracks a single `tax_year` per client. Real CPA workflows span multiple years per client. This is a data model concern that should be addressed early before more features are built on top.

**Scope:**

- Support multiple tax years per client (not just one)
- Year selector in client detail view
- Documents grouped by tax year
- Carry-forward data between years
- Historical view of all years

### 4. Notifications & Email System

**Why:** CPAs need to notify clients when documents are needed, when reviews are complete, when tasks are due. Clients need notifications when portal items change. The settings schema already has `email_on_upload` and `email_on_task_complete` fields.

**Scope:**

- Email service integration (Resend, SendGrid, or similar)
- Transactional emails: portal invites, document received, document reviewed, task assigned, reminder for missing docs
- In-app notification center (bell icon with unread count)
- Notification preferences per user
- Email templates with org branding

### 5. Team Management

**Why:** CPA firms have multiple staff. Admins need to invite team members, assign roles, and manage access. The user/role system exists in the DB but has no management UI.

**Scope:**

- Invite team members via email (generates Clerk invite or magic link)
- Role assignment and management (admin/cpa/staff)
- Team member list in Settings with edit/remove
- Role-based permissions enforcement in API routes
- Activity log per team member

---

## Phase 3: Business Operations & Insights (Medium Priority)

### 6. Reporting & Analytics

**Why:** The current dashboard shows 4 stat cards and a recent activity feed. CPA firms need deeper insights into workload, client status, document processing, and team performance.

**Scope:**

- Client status overview (how many in each stage)
- Document processing metrics (OCR success rate, average processing time, volumes by category)
- Team workload distribution (tasks/docs per team member)
- Tax season progress tracker (% of clients completed)
- Exportable reports (CSV, PDF)
- Charts and visualizations (recharts or similar)

### 7. Workflow Automation / Pipeline

**Why:** TaxDome's biggest draw is workflow automation. CPAs need to define repeatable multi-step workflows (e.g., "New Client Onboarding" -> send organizer -> collect docs -> review -> prepare return -> get signature -> file).

**Scope:**

- Workflow template builder (sequence of steps)
- Automated triggers (document uploaded -> move to next step, task completed -> notify client)
- Status pipeline view (kanban-style board per workflow stage)
- Recurring workflows (annual tax prep cycle)
- Conditional logic (if W-2 received, mark income docs complete)

### 8. E-Signatures

**Why:** Engagement letters, 8879 (IRS e-file authorization), and other forms require client signatures. TaxDome includes unlimited e-signatures. This is a major workflow bottleneck without it.

**Scope:**

- Integration with e-signature provider (DocuSign, or build lightweight with canvas-based signing)
- Signature request workflow (send doc -> client signs in portal -> signed copy stored)
- Engagement letter templates
- 8879 / e-file authorization flow
- Audit trail for signed documents

### 9. Secure Messaging / Client Communication

**Why:** Email is insecure for tax data. CPA-client messaging within the portal keeps communication in context and creates an audit trail.

**Scope:**

- Thread-based messaging per client
- File attachments in messages
- Client portal message access
- Read receipts and notification integration
- Message history searchable by CPA

---

## Phase 4: Monetization & Billing (Lower Priority)

### 10. Time Tracking

**Why:** CPA firms bill by the hour. Tracking time against clients and tasks is essential for profitability analysis and invoicing.

**Scope:**

- Timer widget (start/stop per task or client)
- Manual time entry
- Time entries linked to clients and tasks
- Timesheet views (daily, weekly)
- Billable vs. non-billable categorization
- DB: new `time_entries` table

### 11. Billing & Invoicing

**Why:** CPA firms need to bill clients for services. The DB has `subscription_tier` but no payment system. Beyond SaaS billing, firms need client-facing invoicing.

**Scope:**

- SaaS subscription management (Stripe integration for firm billing)
- Client invoicing (generate invoices, track payments)
- Time-based billing support (ties into time tracking)
- Payment collection (Stripe, CPACharge, or similar)
- Invoice templates and history

### 12. Document Retention & Archival

**Why:** CPA firms must retain client records for specific periods (typically 7 years for tax). Current system has no archival or retention policy features.

**Scope:**

- Configurable retention periods per document category
- Automated archival after tax year closes
- Bulk export / download per client per year
- Secure deletion with audit trail
- Year-over-year client history

---

## Phase 5: Integrations & Compliance (Deferred)

### 13. IRS Integration & Tax Form Support

**Why:** Canopy's direct IRS transcript pull is a major differentiator but complex to build.

**Scope:**

- IRS e-Services / transcript pull integration
- Prior year return data import
- Tax form library with field mapping

### 14. Accounting Software Integration

**Why:** CPA firms use QuickBooks, Xero, etc. Data needs to flow between systems. Nice-to-have, not blocking.

**Scope:**

- QuickBooks Online integration (client sync, invoice sync)
- Xero integration
- Data import/export capabilities

### 15. WISP / Data Security Compliance

**Why:** IRS requires all tax preparers to maintain a Written Information Security Plan (WISP) under the FTC Safeguards Rule. Important but the app already has solid security foundations (Clerk MFA, Supabase RLS, audit logs).

**Scope:**

- MFA enforcement for all users
- Session timeout and access controls
- Security event logging
- Data retention policies
- WISP compliance checklist in Settings

---

## Implementation Order

| Order | Feature | Phase | Reasoning |
| ----- | ------- | ----- | --------- |
| 1 | Client Portal | 2 | Highest impact, infrastructure partially exists |
| 2 | Document Checklists & Organizers | 2 | Directly supports portal, DB tables ready |
| 3 | Multi-Year Client Support | 2 | Data model fix needed before scaling |
| 4 | Notifications & Email | 2 | Enables all communication workflows |
| 5 | Team Management | 2 | Needed for any multi-user firm |
| 6 | Reporting & Analytics | 3 | Business intelligence for firm operations |
| 7 | Workflow Automation | 3 | Major competitive differentiator |
| 8 | E-Signatures | 3 | Critical for engagement letters and 8879 |
| 9 | Secure Messaging | 3 | Completes the client communication loop |
| 10 | Time Tracking | 4 | Required for billing |
| 11 | Billing & Invoicing | 4 | Revenue generation feature |
| 12 | Document Retention | 4 | Compliance and long-term management |
| 13 | IRS Integration | 5 | Deferred - complex external integration |
| 14 | Accounting Software Integration | 5 | Deferred - nice-to-have ecosystem play |
| 15 | WISP Compliance | 5 | Deferred - foundations already solid |

## Competitor Reference

- **TaxDome** - Most comprehensive all-in-one (portal, e-sign, organizers, CRM, payments, workflows)
- **Canopy** - Strong on IRS integration, modular pricing, AI assistant
- **SmartVault** - Best pure document management with tax software integrations
- **Karbon** - Best for larger firms, strong workflow automation
