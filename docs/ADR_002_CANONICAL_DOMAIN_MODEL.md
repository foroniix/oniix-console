# ADR 002 - Modele Canonique Channel / Stream / Playback / Analytics

- Statut: accepte
- Date: 2026-03-15

## Contexte

Le repo porte aujourd'hui deux modeles live/playback qui coexistent:

- un modele `stream-centric` utilise par la console actuelle et une partie des APIs mobile:
  - `streams`
  - `analytics_events`
  - `viewer_sessions_live`
  - `stream_stats`
- un modele `channel-centric` introduit pour le playback OTT securise:
  - `channels.origin_hls_url`
  - `playback_sessions`
  - `playback_events`
  - `channel_realtime_presence`
  - `channel_stats_minute`
  - `channel_health`

Cette coexistence cree une ambiguite sur:

- l'identifiant public de lecture
- la source de verite des analytics live
- le role exact de `channel` par rapport a `stream`
- le contrat mobile de lecture

## Decision

### 1. Tenancy

- `tenant_memberships` est la source de verite des appartenances utilisateur -> tenant.
- `app_metadata.tenant_id` dans le JWT ne represente que le workspace actif de la session.
- Toute future gestion multi-workspace doit partir de cette distinction.

### 2. Entites metier

#### Channel

`channel` est l'entite de diffusion publiee.

Elle porte:

- l'identite editoriale
- le branding
- la programmation
- le point d'entree live cote utilisateur
- l'origine live publiee actuellement via `origin_hls_url`

Le `channel_id` devient l'identifiant canonique du live expose au mobile et aux apps clientes.

#### Stream

`stream` est une entite operationnelle de production live rattachee a un channel.

Elle porte:

- l'etat live interne
- les parametres techniques de diffusion
- les stats operationnelles de flux
- le point d'origine utilise aujourd'hui par la console legacy via `hls_url`

Un channel peut avoir `0..n` streams.

Tant qu'aucun mecanisme explicite de publication n'existe, la regle produit retenue est:

- au plus un stream "publie" par channel pour l'experience utilisateur
- les APIs existantes qui choisissent le premier stream `LIVE` d'un channel sont un comportement transitoire, pas un contrat final suffisant

#### Program / Program Slot / Replay

- `program` est l'entite editoriale
- `program_slot` est l'instance planifiee sur un channel
- `replay` est un contenu diffuse en rattrapage, rattache a un channel et eventuellement a un stream source

Le rattachement canonique pour l'EPG et l'experience client reste `channel_id`.

## 3. Playback canonique

Le playback live canonique suit ce flux:

1. le client demande une session de lecture pour un `channel_id`
2. l'API playback valide l'acces et cree ou reprend une session
3. l'API retourne une URL signee de media gateway
4. la media gateway sert playlists, segments et cles

Consequences:

- `channels.origin_hls_url` est la source de verite actuelle du live publie
- `streams.hls_url` n'est pas un contrat public durable pour les clients finaux
- les clients finaux ne doivent plus lire directement `streams.hls_url`

Pour les replays:

- `replays.hls_url` reste acceptable a court terme comme compatibilite
- si les exigences de securisation replay deviennent equivalentes au live, le replay devra suivre le meme schema de playback signe

## 4. Analytics canoniques

### Canonique cible

Les analytics live/QoE canoniques deviennent:

- `playback_sessions`
- `playback_events`
- `channel_realtime_presence`
- `channel_stats_minute`
- `channel_health`

Ces tables sont le modele de reference pour:

- audience live
- watch time
- buffering
- erreurs player
- supervision d'origine
- KPIs channel-centric

### Compatibilite temporaire

Les tables suivantes restent supportees pour compatibilite pendant la migration:

- `analytics_events`
- `viewer_sessions_live`
- `stream_stats`

Regle de gouvernance:

- aucun nouveau chantier produit ne doit etendre ce modele legacy comme source de verite long terme
- les endpoints existants peuvent encore y lire/ecrire tant que le mobile et les dashboards ne sont pas migres
- les fallbacks doivent etre explicites et documentes

## 5. Contrat mobile cible

Le contrat cible du mobile est separe en deux couches:

- `program-grid` / catalogue / now-next:
  - retourne metadata, `channel_id`, `stream_id` si utile a l'UX, et informations editoriales
- `playback`:
  - resout une URL de lecture signee a partir du `channel_id`

Le `program-grid` ne doit plus etre responsable de fournir une URL live publique definitive.

## Consequences techniques

- Il faut documenter une source de verite unique par domaine.
- Il faut versionner les migrations manquantes de `streams`, `analytics_events` et `stream_stats`.
- Il faut supprimer a terme les dependances client a `streams.hls_url`.
- Il faut introduire plus tard une relation explicite de publication live par channel si plusieurs streams actifs par channel deviennent un besoin metier.

## Plan de migration

1. Garder `channel` comme identifiant public du live.
2. Garder `stream` comme entite operationnelle interne.
3. Basculer les clients live vers l'API playback par `channel_id`.
4. Migrer progressivement les dashboards vers le modele `playback_*` et `channel_*`.
5. Retirer ensuite les usages directs de `analytics_events`, `viewer_sessions_live` et `stream_stats` quand les equivalents canoniques couvrent les besoins.
