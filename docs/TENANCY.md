# Tenancy and RLS

## Source of truth
- The tenant identifier lives in Supabase Auth `app_metadata.tenant_id`.
- `user_metadata` is not trusted for tenant scoping.
- Server code uses `requireAuth` + `requireTenant` to build a trusted tenant context.
- `GET /api/auth/me` is auth-only and does not require tenant membership.
- Ensure `app_metadata.tenant_id` is set for every tenant-scoped user.

## JWT claims and RLS
- RLS reads claims via `auth.jwt()` which is the same as `request.jwt.claims`.
- Supabase Auth embeds `app_metadata` into the JWT at session creation.
- When `app_metadata.tenant_id` changes (invite acceptance, provisioning), the user must refresh the session to receive a new token.

## Membership model (required)
- `tenant_memberships` links users to tenants and stores the role.
- The app checks membership on every tenant-scoped route.
- If `tenant_memberships` is missing, tenant-scoped routes will return 403.

## Migration (reference)
See `docs/migrations/tenant_memberships.sql` and adjust foreign keys to your schema.

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
