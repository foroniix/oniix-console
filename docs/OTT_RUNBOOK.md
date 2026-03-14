# Oniix OTT Runbook

## Monitoring Targets

- disponibilité master playlist
- disponibilité media playlist
- disponibilité segment
- taux d’erreurs player
- pics de buffering
- sessions actives anormales
- explosion d’événements `error`

## Incident Triage

### Flux down

1. Vérifier `channel_health`.
2. Vérifier si `origin_hls_url` répond hors Oniix.
3. Vérifier les logs Worker: `origin fetch failed`, `rewrite failures`.
4. Vérifier si le domaine éditeur a changé.
5. Désactiver temporairement la chaîne si l’origine reste indisponible.

### Token invalid / 401

1. Vérifier `HLS_TOKEN_SECRET` identique entre Supabase et Cloudflare.
2. Vérifier l’horloge système.
3. Vérifier la TTL configurée.
4. Vérifier que `channel_id` de l’URL correspond bien au token.

### Analytics gap

1. Vérifier `analytics_ingest`.
2. Vérifier les batchs offline mobile.
3. Vérifier `aggregate_realtime_stats`.
4. Vérifier `channel_realtime_presence`.

### Cache stale

1. Réduire `PLAYLIST_CACHE_TTL_SEC`.
2. Vérifier que les playlists live ne sont pas forcées à un TTL long via des règles Cloudflare.
3. Purger le cache du hostname streaming si nécessaire.

## Operational Checklist

- secrets alignés entre Edge Functions et Worker
- cron `aggregate_realtime_stats` actif
- cron `check_channel_health` actif
- hostname `stream.oniix.space` sur Worker
- `origin_hls_url` renseigné pour chaque chaîne active
- dashboard stats vérifié sur au moins une chaîne active
- runbook support partagé aux ops

## Production Readiness Checklist

- migration appliquée
- RLS validée sur toutes les tables analytics
- aucune app mobile ne lit directement un domaine tiers
- réponses playlist testées avec URLs relatives et absolues
- segments `.ts` et `.m4s` validés
- `Range` requests testées
- health checks en place
- logs Worker consultables
- alerte basique sur `channel_health.status = down`
- alerte basique sur hausse d’`error_count`
