# Schema Map

Etat de reference du schema observe dans le repo au 2026-03-15.

## Regles de lecture

- `canonique`: source de verite retenue pour la cible architecture.
- `compatibilite`: encore utilise en production applicative, mais pas la cible long terme.
- `drift`: le code depend du schema, mais la migration canonique manque ou est incomplete dans le repo.

## Tenancy et gouvernance

| Table | Role | Statut | Notes |
| --- | --- | --- | --- |
| `tenants` | workspace SaaS | canonique | Versionnee dans `supabase/migrations/20260309113000_ott_hls_proxy_analytics.sql`. |
| `tenant_memberships` | appartenance user -> tenant | canonique | Source de verite des memberships; documente dans `docs/migrations/tenant_memberships.sql`. |
| `tenant_invites` | onboarding invite | canonique | Utilise par les routes tenant; non cartographie ici en detail. |
| `tenant_ingest_keys` | auth ingest tenant | canonique | Versionnee dans `docs/migrations/tenant_ingest_keys.sql`. |
| `audit_logs` | audit applicatif | canonique | Documente dans `docs/migrations/audit_logs.sql`. |
| `user_notifications` | notifications console | canonique | Versionnee dans `supabase/migrations/20260314084500_console_notifications.sql`. |

## Distribution et operation live

| Table | Role | Statut | Notes |
| --- | --- | --- | --- |
| `channels` | entite publiee, branding, EPG, point d'entree playback | canonique | Versionnee par la migration OTT puis completee par `supabase/migrations/20260315183000_console_live_schema_alignment.sql` pour `category`, `logo` et `active`. |
| `streams` | flux live operationnel rattache a un channel | canonique | Versionnee dans `supabase/migrations/20260315183000_console_live_schema_alignment.sql`. |
| `channel_health` | supervision d'origine HLS par channel | canonique | Versionnee dans la migration OTT. |

## Programmation et replay

| Table | Role | Statut | Notes |
| --- | --- | --- | --- |
| `programs` | catalogue editorial | canonique | Versionnee dans `docs/migrations/programming_replays.sql`. |
| `program_slots` | grille / EPG par channel | canonique | Versionnee dans `docs/migrations/programming_replays.sql`. |
| `replays` | catalogue replay | canonique | Lie `channel_id` et optionnellement `stream_id`. |
| `replay_generation_jobs` | pipeline de generation de clips replay | canonique | Versionnee dans `docs/migrations/replay_clip_jobs.sql`. |

## Playback et analytics OTT

| Table | Role | Statut | Notes |
| --- | --- | --- | --- |
| `playback_sessions` | session live canonique cote player/gateway | canonique | Creee par `POST /api/mobile/playback-url` et la future media gateway. |
| `playback_events` | evenements player canonique | canonique | Ingestion par `supabase/functions/analytics_ingest`. |
| `channel_realtime_presence` | audience live instantanee par channel | canonique | Alimentee depuis `playback_events`. |
| `channel_stats_minute` | agregats minute par channel | canonique | Utilisee pour KPIs live et historique court. |

## Analytics console legacy / compatibilite

| Table | Role | Statut | Notes |
| --- | --- | --- | --- |
| `analytics_events` | event log stream-centric | compatibilite | Versionnee dans `supabase/migrations/20260315183000_console_live_schema_alignment.sql`. |
| `viewer_sessions_live` | audience live stream-centric | compatibilite | Versionnee dans `supabase/migrations/20260315183000_console_live_schema_alignment.sql`; la version `docs/migrations/` reste une reference historique. |
| `stream_stats` | stats operationnelles par stream | compatibilite | Versionnee dans `supabase/migrations/20260315183000_console_live_schema_alignment.sql`. |

## Sources de verite retenues

### Tenancy

- appartenance: `tenant_memberships`
- workspace actif de session: JWT `app_metadata.tenant_id`

### Live public

- identifiant public: `channel_id`
- origine live publiee actuelle: `channels.origin_hls_url`
- URL de lecture publique cible: API playback + media gateway

### Live operations

- entite de pilotage: `streams`
- stats operationnelles temporaires: `stream_stats`

### Audience et QoE

- cible canonique: `playback_sessions`, `playback_events`, `channel_realtime_presence`, `channel_stats_minute`
- compatibilite temporaire: `analytics_events`, `viewer_sessions_live`

### Programmation

- canal editorial: `channel_id`
- replay: `replays.channel_id`, `replays.stream_id` optionnel

## Drift observe

### 1. Ecart historique de versioning

Le repo a maintenant une migration d'alignement pour:

- `streams`
- `analytics_events`
- `viewer_sessions_live`
- `stream_stats`

Les environnements deja existants doivent toutefois etre migres pour converger vers ce schema versionne.

### 2. Drift de colonnes sur `channels`

Le code applicatif attend au minimum:

- `category`
- `logo`
- `active`
- `is_active`
- `origin_hls_url`

La migration OTT initiale ne formalisait qu'une partie de ce schema. La migration d'alignement versionnee complete maintenant cette attente applicative.

### 3. Contrat live client en transition

Le live mobile ne depend plus de `streams.hls_url`:

- `GET /api/mobile/program-grid` sert uniquement le metadata/editorial et les replays
- `POST /api/mobile/playback-url` retourne la playback URL live signee par `channel_id`

Les compatibilites restantes sont:

- `replays.hls_url` pour la lecture replay
- quelques usages legacy console autour de `streams.hls_url`

### 4. Coexistence de deux modeles d'audience live

- `viewer_sessions_live` pour le modele stream-centric
- `channel_realtime_presence` pour le modele OTT channel-centric

Cette duplication doit rester transitoire.

## Priorites schema

1. Appliquer la migration d'alignement sur les environnements existants.
2. Verifier la coherence des donnees historiques sur `channels.active` et `channels.is_active`.
3. Finaliser les clients restants sur l'API playback par `channel_id`.
4. Reduire progressivement les usages de `analytics_events`, `viewer_sessions_live` et `stream_stats`.
