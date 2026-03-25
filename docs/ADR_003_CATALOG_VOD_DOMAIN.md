# ADR 003 - Domaine Catalog / VOD pour la plateforme Oniix

- Statut: accepte
- Date: 2026-03-24

## Contexte

La plateforme Oniix a depasse le stade MVP sur le domaine `live TV`:

- `channels`
- `streams`
- `programs`
- `program_slots`
- `replays`
- playback live securise
- analytics live web + mobile

Le besoin produit suivant est maintenant retenu:

- separer l'experience `TV` et `Catalogue` dans l'application mobile
- permettre aux tenants de gerer des films, series, saisons et episodes dans la console
- preparer Oniix a accueillir des partenaires catalogue de type studio, agregateur ou plateforme media
- rester compatible avec le modele multi-tenant et les briques OTT deja en place

La plateforme ne doit donc plus etre pensee comme une simple console de chaines live, mais comme une plateforme hybride:

- Live TV
- Replay
- Catalog / VOD

## Decision

### 1. Oniix devient une plateforme hybride de distribution

La plateforme cible comporte trois domaines de diffusion:

- `Live TV`: chaines, directs, now/next, EPG
- `Replay`: contenus issus du live, rattaches a un channel et eventuellement a un stream
- `Catalog / VOD`: films, series, saisons, episodes et assets de lecture a la demande

Le `replay` reste un domaine distinct du `catalog`.

Un replay est un contenu de rattrapage issu du live.
Un contenu `catalog` est un actif editorial autonome, gere comme un produit media a part entiere.

### 2. Bounded contexts

La cible architecture est decoupee en contextes metier explicites.

#### A. Live Operations

Responsabilites:

- channels
- streams
- health
- programmation live
- supervision

Tables existantes / cibles:

- `channels`
- `streams`
- `programs`
- `program_slots`
- `stream_stats`
- `channel_health`

#### B. Catalog / VOD

Responsabilites:

- films
- series
- saisons
- episodes
- metadonnees editoriales
- assets visuels
- sources video VOD
- disponibilite et publication catalogue

Tables cibles:

- `catalog_titles`
- `catalog_seasons`
- `catalog_episodes`
- `catalog_media_assets`
- `catalog_playback_sources`
- `catalog_publications`
- `catalog_genres`
- `catalog_title_genres`
- `catalog_people`
- `catalog_title_people`

#### C. Shared Playback & Analytics

Responsabilites:

- session de lecture
- URL de lecture signee
- media gateway
- watch progress
- analytics de lecture

La couche playback devient multi-type.

Elle doit supporter:

- `channel`
- `replay`
- `movie`
- `episode`

#### D. Partner Ingest & Distribution

Responsabilites:

- connecteurs fournisseurs catalogue
- import CSV / API / manifest
- suivi des jobs d'ingestion
- mapping des metadonnees et des droits

Tables cibles:

- `catalog_partner_sources`
- `catalog_ingest_jobs`
- `catalog_ingest_job_items`

### 3. Entites canoniques du domaine Catalog

#### catalog_titles

Entite editoriale canonique pour:

- `movie`
- `series`

Champs attendus:

- tenant
- type
- slug
- titre
- titre original
- synopsis court / long
- annee
- classification
- langue originale
- pays d'origine
- statut editorial
- metadata libre

#### catalog_seasons

Entite rattachee a un `series`.

Elle porte:

- numero de saison
- titre de saison
- synopsis
- ordre d'affichage
- statut editorial

#### catalog_episodes

Entite rattachee a:

- un `series`
- une `season`

Elle porte:

- numero episode
- titre
- synopsis
- duree
- date de premiere diffusion
- statut editorial

#### catalog_playback_sources

Entite technique rattachee a:

- un `movie`
- un `episode`

Elle porte:

- type de source (`hls`, `dash`, `file`)
- URL origine
- mode de delivery
- DRM
- audio tracks
- subtitle tracks
- duree
- checksum / controle qualite

Le client final ne doit pas consommer directement `origin_url`.
La lecture doit passer par la meme logique de playback securise que le live.

#### catalog_publications

Entite de publication / availability.

Elle porte:

- tenant
- type de contenu publie
- contenu publie
- fenetre de disponibilite
- visibilite
- territoires autorises / bloques
- storefront / surface cible
- date de publication

### 4. Separation mobile: TV vs Catalogue

L'application mobile doit separer nettement:

- `TV`: parcours live, now/next, chaines, replay live-adjacent
- `Catalogue`: films, series, saisons, episodes, recherche, ma liste, reprendre

Cette separation est produit, pas seulement visuelle.

Les KPIs, les pages et les parcours doivent etre distingues:

- analytics live
- analytics catalogue

### 5. Unification playback

Le playback ne doit plus etre pense en termes de route specifique a un seul domaine.

La cible est une API playback unifiee:

`POST /api/playback/session`

Payload logique:

- `playable_type`
- `playable_id`
- contexte device / app / operateur

Reponse logique:

- session
- URL signee
- metadonnees de lecture
- decision sponsorship / operator si applicable

Le contrat `POST /api/mobile/playback-url` peut rester comme facade de compatibilite tant que le nouveau contrat n'est pas generalise.

### 6. Analytics

La cible analytics doit distinguer:

- `content_domain = live | replay | catalog`
- `playable_type = channel | replay | movie | episode`

Le dashboard doit ensuite exposer:

- KPIs live
- KPIs replay
- KPIs catalog

### 7. Tenancy et roles

Le domaine catalog reutilise le socle existant:

- `tenant_memberships`
- JWT `app_metadata.tenant_id` comme workspace actif
- capabilities tenant

Les roles existants restent valides.

Les capacites a utiliser / etendre:

- `edit_catalog`
- `view_analytics`
- `manage_workspace`
- `manage_security`

### 8. Ce qui est explicitement rejete

- Reutiliser `replays` comme modele VOD principal
- Ajouter seulement deux tables `movies` et `series` sans modeliser saisons, episodes et publication
- Exposer directement les URLs VOD d'origine au mobile
- Melanger l'interface TV et catalogue dans un seul flux principal sans separation produit

## Consequences

### Benefices

- Oniix peut operer a la fois des chaines TV et des catalogues premium
- l'app mobile devient credible pour une strategie hybride live + VOD
- la plateforme devient presentable a des partenaires catalogue serieux
- le modele de droits, publication et analytics devient extensible

### Cout

- nouveau domaine metier a construire
- refonte partielle console
- refonte partielle mobile
- besoin d'une vraie couche ingest partenaire

## Ordre d'execution retenu

1. schema canonique `catalog / vod`
2. API playback unifiee par `playable_type`
3. console catalogue: titres, series, saisons, episodes, publications
4. mobile: separation TV / Catalogue
5. ingest partenaire
6. analytics VOD

