# Oniix Console

Console SaaS multi-tenant pour l'exploitation OTT: tenants, chaines, direct, programmation, replays, analytics et operations.

## Perimetre

- `src/`: console Next.js 16 et APIs serveur.
- `supabase/`: migrations et Edge Functions.
- `shared/ott/`: logique partagee HLS / OTT.
- `mobile/`: notes d'integration iOS / Android pour le player et les analytics.
- `docs/`: architecture, tenancy, runbooks et migrations complementaires.
- `cloudflare/worker/`: prototype legacy. Ce n'est plus la cible d'architecture.

## Architecture

Le projet est organise en deux couches:

- Control plane: console admin, auth, tenants, parametres, programmation, supervision, analytics.
- Playback / data plane: securisation des URLs de lecture, masquage des origines HLS, collecte analytics, audience live.

La cible actuelle n'utilise pas Cloudflare Worker en production. Le design retenu est:

- `Next.js + Supabase` pour le control plane.
- une media gateway dediee pour servir playlists et segments HLS a l'application mobile.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Supabase Auth / Postgres / Realtime / Edge Functions
- Tailwind CSS
- Vitest

## Prerequis

- Node.js 20+
- npm
- projet Supabase configure

## Installation

```bash
npm install
copy .env.local.example .env.local
```

Renseigner ensuite les secrets dans `.env.local`.

Voir aussi:

- [SETUP.md](C:/Users/53lim/Downloads/superadmin/docs/SETUP.md)
- [TENANCY.md](C:/Users/53lim/Downloads/superadmin/docs/TENANCY.md)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

## Documentation utile

- [ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md](C:/Users/53lim/Downloads/superadmin/docs/ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md)
- [ADR_002_CANONICAL_DOMAIN_MODEL.md](C:/Users/53lim/Downloads/superadmin/docs/ADR_002_CANONICAL_DOMAIN_MODEL.md)
- [SCHEMA_MAP.md](C:/Users/53lim/Downloads/superadmin/docs/SCHEMA_MAP.md)
- [OTT_ARCHITECTURE.md](C:/Users/53lim/Downloads/superadmin/docs/OTT_ARCHITECTURE.md)
- [OTT_DEPLOYMENT.md](C:/Users/53lim/Downloads/superadmin/docs/OTT_DEPLOYMENT.md)
- [OTT_RUNBOOK.md](C:/Users/53lim/Downloads/superadmin/docs/OTT_RUNBOOK.md)
- [MOBILE_PROGRAM_GRID.md](C:/Users/53lim/Downloads/superadmin/docs/MOBILE_PROGRAM_GRID.md)

Les documents `OTT_*` decrivent encore en partie le prototype Worker historique. La cible officielle sans Cloudflare est definie dans l'ADR ci-dessus.

## Donnees et tenancy

- Le tenant actif provient du JWT Supabase `app_metadata.tenant_id`.
- L'isolation multi-tenant repose sur `tenant_memberships` et les policies RLS.
- Les routes admin console utilisent les cookies de session httpOnly, pas de token expose au navigateur.

## Etat actuel

Le repo contient deja:

- gestion tenants / invites / memberships
- channels, streams, programmation et replays
- analytics live et historiques
- notifications console
- briques OTT partagees pour HLS

Le repo contient aussi des elements historiques / transitoires qui doivent etre consolides:

- coexistence de plusieurs modeles analytics
- dossier `cloudflare/worker` encore present mais hors cible
- documentation et migrations a aligner avec le schema reel

## Qualite

Avant toute mise en production, verifier au minimum:

```bash
npm test
npm run lint
```

Puis relire les runbooks et l'architecture avant de deployer.
