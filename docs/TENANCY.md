# Tenancy and RLS

## Source of truth
- `tenant_memberships` is the source of truth for user -> tenant memberships.
- The active workspace for the current session lives in Supabase Auth `app_metadata.tenant_id`.
- `user_metadata` is not trusted for tenant scoping.
- Server code uses `requireAuth` + `requireTenant` to build a trusted tenant context.
- `GET /api/auth/me` is auth-only and does not require tenant membership.
- Ensure `app_metadata.tenant_id` always points to one tenant the user actually belongs to.

## JWT claims and RLS
- RLS reads claims via `auth.jwt()` which is the same as `request.jwt.claims`.
- Supabase Auth embeds `app_metadata` into the JWT at session creation.
- When `app_metadata.tenant_id` changes (invite acceptance, provisioning, workspace switch), the user must refresh the session to receive a new token.

## Membership model (required)
- `tenant_memberships` links users to tenants and stores the role.
- The app checks membership on every tenant-scoped route.
- If `tenant_memberships` is missing, tenant-scoped routes will return 403.

## Canonical tenant roles
- `owner`: full tenant governance, sensitive settings, memberships, invites, ingest/security.
- `admin`: tenant administration and operations, but should not manage `owner` assignments.
- `editor`: operational/editorial role for channels, streams, programming and day-to-day content work.
- `viewer`: read-oriented access.
- Legacy aliases such as `member` and `tenant_admin` are normalized server-side to `viewer` and `admin`.

## Sensitive permission boundaries
- Workspace settings, audit logs and ingest key rotation require tenant management capabilities.
- Campaigns and creatives for Ads/monetization should require a dedicated monetization capability.
- Members and invites are governed by capability checks plus target-role checks.
- `owner` can manage `admin`, `editor` and `viewer`.
- `admin` can manage `editor` and `viewer`.
- `editor` and `viewer` cannot manage memberships or security-sensitive settings.
- Tenant-scoped API routes should use the shared helpers in `src/app/api/tenant/_utils.ts`.
- `requireTenantAccess(capability)` is the preferred pattern for route gating when the route only needs one capability check.

## Workspace switching
- `GET /api/tenant/workspaces` returns the authenticated user's memberships and the active workspace.
- `POST /api/tenant/workspaces` switches the active workspace by updating `app_metadata.tenant_id`.
- The switch route immediately refreshes the auth cookies so the next server request uses the new JWT claims.
- UI state alone is not enough for workspace switching; the active tenant must stay aligned with the JWT used by RLS and server routes.

## Superadmin onboarding bootstrap
- `POST /api/superadmin/tenants` can bootstrap the first operational resources for a tenant.
- Supported bootstrap inputs are: `ownerEmail`, `initialChannelName`, `initialChannelCategory`, `initialOriginHlsUrl`, `createInitialStream`, `initialStreamTitle`, `provisionIngestKey`.
- The route creates the tenant first, then provisions owner/channel/stream/ingest in best effort.
- Non-critical bootstrap failures are returned as `warnings` without rolling back the tenant itself.
- The superadmin tenants registry exposes onboarding progress via `onboarding_completion`, `onboarding_total`, `missing_steps`, `channels_count`, `origin_configured` and `ingest_configured`.

## Migration (reference)
See `docs/migrations/tenant_memberships.sql` and adjust foreign keys to your schema.
For mobile analytics ingest key rotation, apply `docs/migrations/tenant_ingest_keys.sql`.
For realtime audience snapshots, apply `docs/migrations/viewer_sessions_live.sql`.
For mobile program grid integration, see `docs/MOBILE_PROGRAM_GRID.md`.

## Mobile analytics auth (SaaS-friendly)
- Recommended: short-lived ingest tokens from `POST /api/mobile/ingest-token`.
- Tenant users do not need to manually generate/rotate keys for basic stats.
- Legacy `x-oniix-ingest` key flow remains supported as fallback.
- Player-facing analytics ingestion endpoints should follow the same pattern (`/api/analytics/ingest`, `/api/analytics/heartbeat`, `/api/analytics/collect`).
- Player-facing Ads runtime endpoints should follow the same pattern (`/api/ads/decide`, `/api/ads/decision`, `/api/ads/event`).

## RLS alignment
Use a single function to read the tenant id from the JWT and reuse it in policies.

```sql
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;
```

Example policy pattern:

```sql
-- SELECT/UPDATE/DELETE
using (tenant_id = public.current_tenant_id())

-- INSERT
with check (tenant_id = public.current_tenant_id())
```
