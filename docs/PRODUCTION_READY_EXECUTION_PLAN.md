# Oniix Production-Ready Execution Plan

Date: 2026-03-24
Owner: Lead Engineering / Product Platform

## Objective

Faire passer Oniix d'une plateforme OTT post-MVP a une plateforme hybride, exploitable en production, capable de porter:

- Live TV
- Replay
- Catalog / VOD
- partenariats operateur
- partenariats catalogue

## Product target

Oniix doit devenir:

- une console multi-tenant pour operer chaines, directs, catalogues et publications
- une application mobile hybride `TV + Catalogue`
- une couche playback securisee et mutualisee
- une plateforme presentable a des partenaires comme agregateurs de catalogue, chaines et telcos

## Workstreams

### WS1 - Architecture & Data

Livrables:

- ADR domaine catalog / VOD
- schema SQL canonique catalog
- schema playback unifie
- schema analytics multi-domaine

Etat:

- ADR 003 cree
- schema SQL fondation cree

### WS2 - Console Core

Cible:

- console cohérente, sans logique MVP residuelle
- domaines clairement separes: live, programmation, catalogue, partenaires, analytics

Sous-lots:

1. shell produit, navigation, roles et legal
2. live operations
3. programmation
4. catalogue
5. publication / droits
6. partenaires
7. analytics dediees live vs catalog

### WS3 - Mobile App

Cible:

- `TV` et `Catalogue` separes
- playback live et VOD unifies
- continue watching, watchlist, recherche, detail title / season / episode

Sous-lots:

1. information architecture finale
2. home TV
3. home Catalogue
4. detail movie
5. detail series / season / episode
6. recherche
7. compte / support / legal / settings

### WS4 - Playback & Media

Cible:

- media gateway unique
- playback session par `playable_type`
- analytics uniformes
- sponsorship / operator compatible

Sous-lots:

1. contrat playback unifie
2. session and token model
3. VOD playback support
4. geo / availability enforcement
5. metering / analytics hooks

### WS5 - Metadata, Rights & Publication

Cible:

- modeliser la distribution comme un produit media, pas comme un simple upload

Sous-lots:

1. titres / saisons / episodes
2. assets visuels
3. genres / cast / crew
4. droits territoriaux
5. fenetres de publication
6. storefront / featured rails

### WS6 - Partner Ingest

Cible:

- ingest manuel, CSV et API
- jobs tracables
- mapping controllable

Sous-lots:

1. partner sources
2. ingest jobs
3. importer CSV
4. importer API
5. QA metadata
6. publication review

### WS7 - Ops / Security / Compliance

Cible:

- vraie exploitation prod

Sous-lots:

1. audit complet
2. notifications actionnables
3. runbooks
4. error budgets / alerting
5. retention / privacy / cookies / legal
6. backup / migration discipline

## Execution order

### Phase 0 - Stabilisation post-MVP

Objectif:

- fermer les angles morts visibles de production

Done / en cours:

- multi-tenant plus propre
- analytics live fiabilisees
- programmation / replays remises sur rails
- branding / legal / cookies
- hygiene UI/UX meilleure

### Phase 1 - Catalog foundation

Objectif:

- poser le nouveau domaine metier

Livrables:

- `catalog_titles`
- `catalog_seasons`
- `catalog_episodes`
- `catalog_playback_sources`
- `catalog_publications`
- `watch_progress`
- `watchlist_items`

Definition of done:

- migrations executees
- API CRUD de base
- tests schema + services

### Phase 2 - Playback unifie

Objectif:

- lecture live + replay + VOD via une meme architecture

Livrables:

- `POST /api/playback/session`
- `playable_type`
- instrumentation analytics unifiee

Definition of done:

- mobile live et VOD passent par le meme coeur playback
- plus aucun client final ne depend d'URLs origine

### Phase 3 - Console Catalog

Objectif:

- rendre le domaine exploitable par un editeur

Livrables:

- pages `Catalogue`, `Films`, `Series`, `Saisons`, `Episodes`, `Assets`, `Publications`
- roles et permissions alignes
- workflow draft -> ready -> published

### Phase 4 - Mobile Catalog

Objectif:

- sortir du modele mobile centré quasi-exclusivement sur le live

Livrables:

- onglet `TV`
- onglet `Catalogue`
- recherche
- ma liste
- reprendre

### Phase 5 - Partner readiness

Objectif:

- rendre Oniix credible pour des partners catalogue et telco

Livrables:

- ingest jobs
- partner sources
- exports / reporting
- catalog QA

## Teams / ownership

### Platform

- tenancy
- auth
- permissions
- playback
- analytics
- schema

### Console

- live ops
- catalog ops
- publication ops
- partner ops

### Mobile

- TV experience
- Catalog experience
- playback UX
- search / watchlist / progress

### Ops / Compliance

- incident management
- legal
- privacy
- deployment discipline

## Quality gates

Chaque lot doit sortir avec:

- executable migration or reviewed schema diff
- API tests
- lint green sur le perimetre
- build green
- no visible placeholder / dev text
- copy et statuts relus produit

## Business readiness for catalog partners

Avant d'aller voir un partenaire catalogue premium, Oniix doit demonstrer:

- metadata propres
- disponibilite et droits par fenetre
- playback robuste
- analytics de consommation
- publication multi-tenant
- separation claire TV / Catalogue dans l'app

## Immediate next implementation lot

1. traduire `catalog_vod_foundation.sql` en vraie migration Supabase
2. creer les types / services backend catalog
3. remplacer la page `series` legacy par un vrai module `catalog`
4. preparer le split mobile `TV / Catalogue`

