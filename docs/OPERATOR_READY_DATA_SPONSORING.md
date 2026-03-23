# Operator Readiness - Data Sponsoring / Zero-Rating / QoD

- Statut: working draft
- Date: 2026-03-22

## Objectif

Ce document cadre ce qu'il manque a Oniix pour devenir presentable a un operateur telecom dans le cadre:

- d'un pilote de data sponsoring / zero-rating
- d'un partenariat d'API reseau type Open Gateway / CAMARA
- d'un modele "channel partner" ou "aggregator" multi-operateur

Il ne remplace pas les ADR existantes. Il s'appuie sur:

- [ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md](C:/Users/53lim/Downloads/superadmin/docs/ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md)
- [ADR_002_CANONICAL_DOMAIN_MODEL.md](C:/Users/53lim/Downloads/superadmin/docs/ADR_002_CANONICAL_DOMAIN_MODEL.md)
- [TENANCY.md](C:/Users/53lim/Downloads/superadmin/docs/TENANCY.md)
- [OPERATOR_PILOT_CELTIIS_BENIN.md](C:/Users/53lim/Downloads/superadmin/docs/OPERATOR_PILOT_CELTIIS_BENIN.md)

## Lecture executive

Oniix est deja assez mature pour un pilote.

Oniix n'est pas encore pret pour un contrat operateur "production-grade" parce qu'il manque:

- une media gateway dediee en production avec hostnames et IP egress stables
- une couche d'integration operateur distincte du coeur console
- des usages / exports / rapports de settlement par operateur et par offre
- des garanties d'exploitation de niveau operateur: SLA, observabilite, runbooks, support L1/L2/L3
- une revue reglementaire et contractuelle pays par pays

## Ce qui est deja en place dans Oniix

### Socle utile

- control plane `Next.js + Supabase`
- multi-tenant et roles documentes dans [TENANCY.md](C:/Users/53lim/Downloads/superadmin/docs/TENANCY.md)
- separation cible `control plane` / `media gateway` dans [ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md](C:/Users/53lim/Downloads/superadmin/docs/ADR_001_MEDIA_GATEWAY_NO_CLOUDFLARE.md)
- modele canonique playback / analytics dans [ADR_002_CANONICAL_DOMAIN_MODEL.md](C:/Users/53lim/Downloads/superadmin/docs/ADR_002_CANONICAL_DOMAIN_MODEL.md)
- playback signe, sessions playback, heartbeat, analytics live
- console SaaS pour chaines, streams, programmation, notifications et operations

### Pourquoi c'est pertinent pour un operateur

Ces briques permettent deja de:

- controler qui lit quel flux et sous quel tenant
- emettre des URLs de lecture courtes et securisees
- tracer les sessions et l'usage
- masquer les origines HLS
- produire des rapports par chaine / tenant / periode

## Modeles de partenariat a distinguer

### 1. Data sponsoring / zero-rating

Objectif:

- le trafic video Oniix n'est pas facture a l'utilisateur final, ou est facture selon une regle speciale

Prerequis principaux:

- traffic playback totalement maitrise
- domaines / IP / chemins techniques identifies
- regles d'eligibilite par offre, pays, operateur et type d'abonne
- rapports de consommation exploitables pour la refacturation ou le settlement

### 2. Quality on Demand

Objectif:

- le trafic n'est pas forcement gratuit, mais le reseau applique une politique qualite adaptee au streaming

Prerequis principaux:

- identification de l'operateur et de la ligne
- orchestration d'appels API reseau
- suivi de policy requests et de leurs resultats

### 3. Modele channel partner / aggregator

Objectif:

- Oniix joue le role d'integrateur entre plusieurs operateurs et les applications clientes / editeurs

Prerequis principaux:

- onboarding applicatif
- routage vers le bon operateur
- modele d'authentification federable
- support / observabilite / billing separes par operateur

## Gap analysis

### A. Media plane

Etat actuel:

- la cible media gateway est definie, mais pas encore industrialisee comme service dedie

Gap:

- il faut un service `media-gateway` propre, pas une accumulation de routes applicatives
- il faut des noms de domaine et des plages IP stables a communiquer aux operateurs
- il faut une politique claire pour `GET`, `HEAD`, `Range`, segments, playlists et keys

Impact:

- sans cela, l'operateur ne peut pas whitelister ou sponsoriser le trafic de facon fiable

### B. Operator integration layer

Etat actuel:

- aucune couche metier explicite pour les operateurs

Gap:

- pas de notion `operator`
- pas de notion `offer`
- pas de notion `sponsorship policy`
- pas de notion `eligibility decision`
- pas de notion `settlement export`

Impact:

- impossible de contractualiser un sponsoring data propre sans bricoler au cas par cas

### C. Usage metering and settlement

Etat actuel:

- analytics et playback sessions existent

Gap:

- pas de comptage settlement-grade par operateur / offre / tenant / chaine / volume
- pas d'exports comptables / usage detail records
- pas de reconciliation entre usage playback et facturation operateur

Impact:

- un operateur ou un sponsor ne pourra pas valider les montants ou la consommation

### D. Security and trust

Etat actuel:

- auth multi-tenant et tokens courts existent deja

Gap:

- pas encore de couche operator credentials / partner credentials dediee
- pas encore de rotation / audit / scope par integration operateur
- pas encore de correlateurs de bout en bout pour les echanges operateur

Impact:

- niveau de confiance insuffisant pour un acces a des APIs reseau ou a un mecanisme de sponsoring critique

### E. Operations and support

Etat actuel:

- base de supervision produit existante

Gap:

- pas de SLA/SLO explicites pour le playback plane
- pas de support modelise L1/L2/L3
- pas de reporting de disponibilite par operateur
- pas de processus d'incident partage operateur / Oniix / editeur

Impact:

- l'operateur considerera la plateforme comme trop applicative et pas assez exploitable

### F. Regulatory / legal

Etat actuel:

- fondations legales publiques commencees sur la console

Gap:

- pas de revue pays par pays sur la neutralite du net, le zero-rating, la privacy et le consentement
- pas de DPA / annexes contractuelles / cadrage de responsabilites

Impact:

- meme avec une integration technique correcte, le partenariat peut etre bloque ou limite

## Architecture cible

```text
Mobile App / Web Player
  -> Oniix Entitlement API
  -> Oniix Media Gateway
  -> Oniix Analytics / Heartbeat

Oniix Operator Integration Service
  -> Eligibility engine
  -> Offer / sponsorship policy engine
  -> Telco routing / operator adapters
  -> Usage metering / settlement exports
  -> Operator callbacks / reporting

Oniix Control Plane
  -> tenants / channels / streams / programming / roles
  -> operator account admin
  -> audit / compliance / support tooling

Supabase / Postgres
  -> product data
  -> playback sessions
  -> sponsored usage records
  -> operator decisions
  -> exports / reconciliation
```

## Composants a ajouter

### 1. Media Gateway

Responsabilites:

- verifier les tokens playback
- masquer totalement les origines
- servir playlists / segments / keys
- maintenir les sessions playback
- produire les metriques de lecture utiles au settlement

### 2. Entitlement API

Responsabilites:

- verifier que le client peut lire la chaine
- decider si la session est sponsorisee ou non
- retourner une reponse de playback enrichie:
  - `playback_url`
  - `sponsorship_status`
  - `operator_id`
  - `offer_id`
  - `policy_id`

### 3. Operator Integration Service

Responsabilites:

- parler le langage des operateurs
- encapsuler les credentials et les routes techniques
- supporter plusieurs adaptateurs:
  - manual zero-rating whitelist
  - direct operator API
  - Open Gateway / CAMARA

### 4. Usage and settlement service

Responsabilites:

- consolider la consommation sponsorisee
- gerer les exports
- produire les rapports par:
  - operateur
  - tenant
  - chaine
  - offre
  - pays

## Modele de donnees cible

Tables a introduire:

- `operator_accounts`
- `operator_regions`
- `operator_offers`
- `operator_credentials`
- `operator_routes`
- `sponsorship_policies`
- `sponsored_sessions`
- `sponsored_usage_buckets`
- `operator_api_calls`
- `operator_callbacks`
- `settlement_exports`
- `settlement_export_items`

Principes:

- ne jamais surcharger les tables analytics existantes avec des champs operateur disperses
- separer les donnees produit et les donnees de settlement
- garder un lien stable avec `tenant_id`, `channel_id`, `playback_session_id`

## API contract cible

### Entitlement

`POST /api/mobile/playback-url`

Reponse cible enrichie:

```json
{
  "playbackUrl": "https://media.oniix.space/hls/...",
  "sessionId": "playback_session_uuid",
  "sponsorship": {
    "eligible": true,
    "status": "sponsored",
    "operatorId": "orange-cm",
    "offerId": "sponsored-tv-basic",
    "policyId": "policy_uuid"
  }
}
```

### Operator admin

APIs a ajouter:

- `GET /api/operator/accounts`
- `POST /api/operator/accounts`
- `POST /api/operator/policies`
- `GET /api/operator/usage`
- `POST /api/operator/exports/run`

## Backlog recommande

### Lot 1 - Operator-ready foundations

Objectif:

- rendre la couche playback controlable par un operateur

Travaux:

- sortir la media gateway en service dedie
- figer les hostnames et IP egress
- standardiser les logs et correlateurs
- ajouter l'observabilite playback plane

Sortie attendue:

- un trafic playback identifiable et whitelstable

### Lot 2 - Sponsorship domain model

Objectif:

- introduire les objets metier operateur sans contaminer le coeur produit

Travaux:

- migrations des tables `operator_*` et `sponsorship_*`
- ecran admin de configuration operateur
- permissions dediees

Sortie attendue:

- Oniix sait modeliser un operateur, une offre et une policy

### Lot 3 - Entitlement and decisioning

Objectif:

- prendre une decision de sponsoring au moment du playback

Travaux:

- enrichir `POST /api/mobile/playback-url`
- brancher eligibility / policy engine
- journaliser les decisions

Sortie attendue:

- chaque session sait si elle est sponsorisee ou non, et pourquoi

### Lot 4 - Settlement and reporting

Objectif:

- rendre le modele facturable / auditale

Travaux:

- bucketisation usage
- exports CSV / API
- reconciliation par operateur et tenant

Sortie attendue:

- usage partageable a un sponsor ou un operateur

### Lot 5 - Pilot operateur

Objectif:

- faire un pilote avec un premier operateur reel

Travaux:

- choisir un pays et un operateur
- fixer les criteres d'eligibilite
- runbook support
- supervision et tableaux de bord dedies

Sortie attendue:

- pilote limite, instrumente, presentable

## Criteres de sortie pour dire "Oniix est pret pour un pilote"

- tout le playback client passe par la media gateway
- hostnames et IP a whitelister documentes
- decision de sponsoring prise et tracee par session
- usage sponsorise exportable par periode
- incident workflow clair entre Oniix, l'operateur et l'editeur
- consentement / privacy / legal review documentes pour le pays cible

## Positionnement recommande

Ne pas vendre Oniix tout de suite comme:

- un "zero-rating platform" global multi-pays deja pret

Vendre Oniix d'abord comme:

- une plateforme OTT SaaS avec media gateway securisee
- capable d'integrer un pilote de sponsoring data ou de QoD
- avec une trajectoire claire vers un role d'aggregator multi-operateur

## Sources officielles a garder comme reference

- GSMA Open Gateway portal: https://open-gateway.gsma.com/docs
- GSMA Open Gateway Channel Partner Onboarding Guide (WA.101): https://www.gsma.com/solutions-and-impact/gsma-open-gateway/wp-content/uploads/2024/02/Channel-Partner-Onboarding-Guide-WA.101-v1.0.pdf
- GSMA Open Gateway Technical Realisation Guidelines (OPG.10): https://www.gsma.com/solutions-and-impact/technologies/networks/wp-content/uploads/2012/10/OPG.10-v2.0-Open-Gateway-Technical-Realisation-Guidelines.pdf
- GSMA Open Gateway API descriptions: https://www.gsma.com/solutions-and-impact/gsma-open-gateway/gsma-open-gateway-api-descriptions/
- BEREC zero-rating overview: https://www.berec.europa.eu/en/what-is-zero-rating?language_content_entity=en
- BEREC Guidelines on the implementation of the Open Internet Regulation: https://www.berec.europa.eu/en/document-categories/berec/regulatory-best-practices/guidelines

## Decision a prendre maintenant

Avant d'implementer, il faut trancher l'axe commercial cible:

1. pilote `zero-rating / sponsored data`
2. pilote `Quality on Demand`
3. trajectoire `aggregator / channel partner`

Le bon ordre technique, lui, ne change presque pas:

- media gateway industrielle
- entitlement et decisioning
- metering et settlement
- pilot operateur
