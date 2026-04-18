# TJS StudySteps - Student Application & EMGS Tracking Platform

This project is a Next.js-based operations platform for education consultants helping students apply to study abroad (with a strong focus on Malaysia).

It centralizes student applications, agent workflows, approval states, EMGS visa tracking, and reporting into one system so teams can move from inquiry to enrollment with better visibility.

## Why This Project Exists

Education consultancies typically manage student progress across multiple disconnected tools:

- forms and spreadsheets for student intake
- messaging apps for agent updates
- external portals for visa progress
- manual status copy/paste for reporting

This causes delays, data mismatch, and poor tracking quality.

### The EMGS Tracking Problem

For students going to Malaysia, EMGS progress is essential but difficult to manage at scale:

- staff must check records one by one
- status timelines are hard to consolidate
- updates are easy to miss
- operations teams often maintain separate Excel trackers manually

As volume grows, this becomes an operational bottleneck.

## Solution Implemented Here

TJS StudySteps provides a structured workflow with role-based access:

- applicants submit study applications
- agents review and approve applications
- super-admin manages operations across applications, agents, and invoices
- EMGS status can be fetched and synchronized directly into the platform

### EMGS Syncing Capabilities

The system includes automated EMGS syncing to reduce manual work:

- per-student EMGS fetch endpoint
- batch sync for multiple Malaysian-destination applications
- status progression storage (percentage + timeline updates + issues)
- UI progress indicators while fetching large batches

This helps teams keep records fresh and actionable without repetitive portal checks.

### Excel Update Workflow (Operations Feature)

Super-admin users can upload an `.xlsx` workbook and update a selected sheet using live EMGS data:

1. upload Excel file
2. choose which worksheet to update
3. locate `Passport_No` and `Visa_Status` columns
4. match passport values with stored student records
5. write EMGS percentage values into `Visa_Status` (e.g., `75%`, `100%`)
6. download updated `.xlsx`

Only the selected sheet cells are updated for this mapping. The rest of the workbook remains unchanged.

## How This Helps Teams

This project improves day-to-day student operations by:

- reducing manual EMGS tracking effort
- improving tracking accuracy across student records
- speeding up status reporting for internal teams and leadership
- enabling export-ready updates for external Excel workflows
- giving agents and admins a single operational source of truth

## Core Stack

- Next.js (App Router)
- React + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS

## Getting Started

Install dependencies:

```bash
npm install
```

Configure environment variables in `.env` (database, auth, email, and any integration keys).

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Areas in the Codebase

- `app/super-admin` - super-admin dashboards and workflows
- `components/applications` - student application management UI
- `app/api/applications` - application + EMGS-related APIs
- `lib/emgs.ts` - EMGS fetch and synchronization logic
- `app/api/applications/excel-emgs/route.ts` - Excel sheet EMGS updater endpoint

## Notes

- EMGS syncing applies to Malaysia-destination applications.
- Role-based session checks are used across protected workflows.
