# Oniix OTT HLS Proxy Architecture

## Project Tree

```text
supabase/
  migrations/
    20260309113000_ott_hls_proxy_analytics.sql
  functions/
    _shared/
    get_playback_url/
    analytics_ingest/
    aggregate_realtime_stats/
    get_channel_realtime_stats/
    check_channel_health/
    resolve_origin/
cloudflare/
  worker/
    src/
    wrangler.example.toml
mobile/
  ios/
    README.md
  android/
    README.md
shared/
  ott/
docs/
  OTT_ARCHITECTURE.md
  OTT_DEPLOYMENT.md
  OTT_RUNBOOK.md
```

## System Diagram

```text
AVPlayer / ExoPlayer
  -> Supabase Edge Function get_playback_url
  -> https://stream.oniix.space/hls/{channel_id}/master.m3u8?token=...
  -> Cloudflare Worker
       -> resolve_origin Edge Function
       -> origin public HLS playlist
       -> playlist rewrite
       -> segments proxied from stream.oniix.space only
  -> analytics_ingest Edge Function
       -> playback_events
       -> playback_sessions
       -> channel_realtime_presence
  -> aggregate_realtime_stats Edge Function
       -> channel_stats_minute
  -> get_channel_realtime_stats Edge Function
       -> tenant dashboard
```

## Core Guarantees

- Les apps mobiles ne lisent jamais directement `origin_hls_url`.
- Toutes les playlists et tous les segments passent par `stream.oniix.space`.
- Les playlists HLS sont réécrites pour ne jamais exposer le domaine éditeur.
- Les analytics produit viennent d’abord du player, pas uniquement du réseau.
- Le multi-tenant est strict via `tenant_memberships`, RLS et service-role réservé aux fonctions Edge.

## Token Design

- Format: `base64url(payload).base64url(signature)`
- Signature: HMAC SHA-256
- TTL: 60 à 120 secondes
- Payload:

```json
{
  "v": 1,
  "exp": 1730000000,
  "cid": "channel_uuid",
  "sid": "session_uuid",
  "did": "sha256(device_id)"
}
```

## Worker Design

### Resolution de l’origine

- Le Worker ne lit pas la base directement.
- Il appelle `resolve_origin`.
- La réponse est cachée 30 secondes côté edge.

### Réécriture HLS

- `master.m3u8` initial résolu depuis `origin_hls_url`.
- Tous les `URI="..."`, variants, clés et segments sont réécrits vers `stream.oniix.space`.
- Chaque ressource interne reçoit un `ref` chiffré AES-GCM contenant l’URL absolue d’origine.
- Le `ref` masque complètement le domaine éditeur côté client.

### Cache Strategy

- Playlists `.m3u8`
  - TTL edge court: `2s`
  - objectif: réduire la latence sans figer le live
  - bypass implicite pour les playlists très dynamiques via TTL très bas
- Segments `.ts`, `.m4s`, `.mp4`
  - TTL edge: `120s` par défaut
  - cache clé basé sur `channel_id + ref`, pas sur le token
  - requêtes `Range` non mises en cache pour éviter les incohérences de fragments

### Cloudflare Cache Rules Recommandées

- Proxy `stream.oniix.space/*` en orange-cloud.
- Ne pas mettre en cache HTML ni routes admin sur ce hostname.
- Autoriser le Worker à gérer le cache applicatif.
- Si vous ajoutez des Cache Rules:
  - `/hls/*/*.m3u8` -> Edge TTL 2s, respect worker headers
  - `/hls/*/*` hors `.m3u8` -> Edge TTL 120s, respect worker headers

## Multi-Tenant Data Model

- `channels.origin_hls_url` est la source de vérité des URLs éditeurs.
- `playback_sessions` contient la session de lecture et l’empreinte réseau immédiate.
- `playback_events` est append-only.
- `channel_realtime_presence` sert au “now”.
- `channel_stats_minute` sert aux graphes minute par minute.
- `channel_health` sert au monitoring des origines.

## Aggregation Logic

- `watch_seconds`
  - calculé entre deux événements successifs quand l’état précédent est `playing`
  - delta capé à 30 secondes par défaut
- `buffer_seconds`
  - calculé entre `buffer_start` et l’événement suivant, capé aussi
- `active_viewers`
  - sessions actives par bucket minute
  - bucket courant corrigé par `channel_realtime_presence`
- `sessions_started`
  - nombre de `session_start`
- `plays`
  - nombre de `play`
- `error_count`
  - nombre de `error`

## Zero-Rating Operator Argument

- L’opérateur ne whitelist qu’un domaine streaming: `stream.oniix.space`.
- Toutes les requêtes média visibles côté terminal passent par ce domaine.
- Les domaines tiers ne sont ni retournés dans les playlists ni exposés au player.
- Cela évite une maintenance flux par flux côté opérateur.

### Information à fournir à l’opérateur

- FQDN streaming: `stream.oniix.space`
- FQDN API si nécessaire: `api.oniix.space`
- protocole: HTTPS/TLS
- type de trafic: HLS playlists + segments
- confirmation que les clients n’appellent aucun domaine média tiers

### Limite à expliciter

- Si l’opérateur exige un whitelisting par IP statique au lieu d’un whitelisting FQDN/SNI, Cloudflare anycast complique le modèle.
- La bonne approche est le whitelisting par FQDN/SNI/TLS hostname.

## Implementation Phases

### Phase 1 - MVP

- `get_playback_url`
- Worker proxy HLS
- réécriture playlists
- token HMAC court
- `analytics_ingest`
- `aggregate_realtime_stats`
- `get_channel_realtime_stats`

### Phase 2 - Hardening

- tuning cache plus fin par type de playlist
- retries mobile offline queue
- alerting santé de flux
- protections anti-abus et rate limiting
- enrichissement diagnostics réseau

### Phase 3 - Industrialisation

- KV ou DO pour mapping d’origine et invalidation fine
- logs edge avancés
- export opérateur / support
- métriques de QoE enrichies
- dashboards incidents et alerting centralisé
