# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase (PostgreSQL + RLS) — external Supabase project
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Urban Eye Authority Dashboard (`/`)
- Full authority dashboard for city corporation staff
- React + Vite frontend with dark government theme
- Bangla UI labels, Supabase auth integration
- Pages: Login, Dashboard, Reports list, Report detail, Analytics
- Backend: Express API at `/api/authority/*`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Required Environment Variables

### For Frontend (VITE_ prefix required)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

### For API Server
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key

## Authority Database Schema (Supabase)

Requires the Urban Eye schema from the attached SQL files including:
- `departments` table (pre-seeded with DNCC, DSCC, WASA, etc.)
- `authority_users` table with RLS policies
- `reports`, `report_images`, `ai_analysis`, `activity_logs` tables
- Demo user: dncc_admin@authority.nagarik.seba / Demo@2025

## Architecture Notes

- Authority auth uses Supabase JWT tokens passed as Bearer headers to the Express API
- All authority queries are department-scoped via RLS policies
- API client auto-attaches Bearer token via `setAuthTokenGetter()`
- Status updates write to both `reports` and `activity_logs` tables

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
