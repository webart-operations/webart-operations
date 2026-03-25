# WebArt Operations Platform Documentation

The WebArt Ops Platform is a specialized internal tool designed to bridge the gap between initial sales and final project delivery. It acts as a middleware for quality control, financial tracking, and team management.

## 🏛️ Core Architecture

The platform is built as a **Single Page Application (SPA)** using:
- **Frontend**: Vite + React + Vanilla CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Integrations**: GoHighLevel (GHL) via Webhooks/API v2

---

## 👥 Role-Based Access Control (RBAC)

The platform enforces strict hierarchy and data isolation based on five distinct roles:

| Role | Responsibility | Visibility |
|---|---|---|
| **CEO** | Global oversight | Full access to all data, revenue, and configurations. |
| **QA** | Quality control | View and audit sales queue, manage config, view all reports. |
| **AM** | Account Mgmt | View projects assigned to them and their PM team's calendars. |
| **PM** | Project Mgmt | View projects assigned to them and their AM's calendar. |
| **Sales** | Lead Gen | Access to Sales Form and their own performance metrics. |

---

## 🚀 Key Modules

### 1. Sales & Reactivations
- **Sales Form**: Prevents duplicate client entries via an intelligent lookup engine. Linked to GHL for instant lead capture.
- **Reactivations**: A streamlined flow for Account Managers to move completed projects back into the sales pipeline for upsells.

### 2. QA Audit Queue
- A dedicated workstation for quality auditors to approve or reject sales.
- **Passing** a sale automatically creates a linked Client and Project record and notifies GHL.
- **Failing** a sale logs the reasons and prevents the project from starting.

### 3. Meetings & Calendars
- **Hierarchical View**: AMs see their PMs' calendars; PMs see their AM's calendar. All roles see the CEO's calendar.
- Integrates directly with GHL booking widgets.

### 4. Revenue & Invoice Engine
- **Financial Ledger**: Tracks every payment logged against a project.
- **Dynamic Invoices**: Generate professional PDFs with custom branding, prefixes, and auto-incrementing numbers.

### 5. Team Management
- An administrative panel for the CEO to manage staff, roles, and explicit reporting relationships (e.g., assigning a PM to report to an AM).

---

## 🛠️ Data Integrity Safeguards

- **Delete Engine**: All database relations use `ON DELETE SET NULL` to prevent "Key Still Referenced" errors while preserving historical logs.
- **Client Deduplication**: The platform matches incoming submissions against existing emails and company names to prevent database bloat.
- **Audit Logs**: Every status change (Project, Submission, QA) is logged with the timestamp and author.
