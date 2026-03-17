# Oniix OTT Deployment Guide

Legacy note: ce document decrit le deploiement du prototype Worker Cloudflare. La cible officielle actuelle est documentee dans `docs/ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md`.

## Environment Variables

### Supabase Edge Functions

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STREAM_BASE_URL=https://stream.oniix.space
HLS_TOKEN_SECRET=
WORKER_RESOLVE_ORIGIN_SECRET=
ORIGIN_REF_SECRET=
INTERNAL_JOB_SECRET=
PLAYBACK_TOKEN_TTL_SEC=90
PRESENCE_WINDOW_SECONDS=35
CHANNEL_HEALTH_TIMEOUT_MS=6000
```

### Cloudflare Worker

```text
STREAM_BASE_URL=https://stream.oniix.space
RESOLVE_ORIGIN_URL=https://<project-ref>.functions.supabase.co/resolve_origin
WORKER_RESOLVE_ORIGIN_SECRET=
HLS_TOKEN_SECRET=
ORIGIN_REF_SECRET=
PLAYLIST_CACHE_TTL_SEC=2
SEGMENT_CACHE_TTL_SEC=120
```

## Setup

1. Appliquer la migration `supabase/migrations/20260309113000_ott_hls_proxy_analytics.sql`.
2. Déployer les Edge Functions Supabase.
3. Configurer les secrets des fonctions.
4. Déployer le Worker Cloudflare sur `stream.oniix.space`.
5. Mettre `origin_hls_url` sur chaque chaîne.
6. Planifier:
   - `aggregate_realtime_stats` toutes les 1 minute
   - `check_channel_health` toutes les 1 à 5 minutes

## Suggested Supabase Commands

```bash
supabase functions deploy get_playback_url
supabase functions deploy analytics_ingest
supabase functions deploy aggregate_realtime_stats
supabase functions deploy get_channel_realtime_stats
supabase functions deploy check_channel_health
supabase functions deploy resolve_origin
```

## Suggested Cloudflare Commands

```bash
cd cloudflare/worker
wrangler deploy
```

## Test Plan

### Unit Tests

```bash
npm test
```

### Integration Smoke Tests

1. Créer une chaîne avec `origin_hls_url`.
2. Appeler `get_playback_url`.
3. Ouvrir la `playback_url` retournée.
4. Vérifier que la playlist renvoyée ne contient aucun domaine tiers.
5. Vérifier qu’un segment HLS est servi depuis `stream.oniix.space`.
6. Envoyer un batch `analytics_ingest`.
7. Lancer `aggregate_realtime_stats`.
8. Vérifier `get_channel_realtime_stats`.
9. Lancer `check_channel_health`.

## Notes de Déploiement

- `console.oniix.space` reste sur Vercel.
- `stream.oniix.space` doit pointer vers le Worker.
- `api.oniix.space` peut pointer vers Supabase edge/functions ou un gateway dédié plus tard.
- Le Worker doit garder les secrets côté serveur uniquement.
