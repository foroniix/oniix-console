# Operator Pilot - Celtiis Benin

- Statut: working draft
- Date: 2026-03-22

## Decision

Le premier partenaire telecom cible d'Oniix est `Celtiis Benin`.

En consequence:

- la strategie operateur d'Oniix doit etre pensee `single-operator first`
- le premier pilote ne doit pas essayer de couvrir tous les cas multi-operateurs
- l'architecture doit rester extensible, mais l'implementation initiale doit etre optimisee pour un seul partenaire telecom

## Pourquoi cette approche est la bonne

Vouloir concevoir tout de suite un moteur multi-operateurs complet serait une erreur.

Pour un premier partenariat, le bon ordre est:

1. valider un cas reel avec un operateur reel
2. prouver la maitrise playback / analytics / entitlement / reporting
3. capitaliser ensuite vers un modele multi-operateur

## Ce qu'on peut raisonnablement inferer sur Celtiis

D'apres son site officiel, Celtiis se presente comme un `operateur global 100% Benin`, avec des offres:

- mobile
- fixe / fibre
- business
- mobile money

Le site public expose aussi des points de contact service client, des CGV mobiles, des offres fixes de gros et des offres mobiles de gros. J'en deduis que le pilote Oniix doit etre prepare de facon suffisamment serieuse pour parler a:

- une equipe business / partenariat
- une equipe technique reseau / wholesale
- une equipe juridique / compliance

Cette lecture est une inference raisonnable a partir des surfaces publiques de Celtiis. Elle doit etre confirmee pendant les premiers ateliers de cadrage.

## Cible pilote recommandee

### Ce que le pilote doit faire

- permettre la lecture OTT d'une ou plusieurs chaines via Oniix
- decider si une session est sponsorisee ou non
- mesurer le volume et l'usage associe
- produire un reporting clair pour Celtiis et Oniix

### Ce que le pilote ne doit pas essayer de faire

- couvrir tous les operateurs du Benin
- couvrir tous les types d'offres Celtiis
- gerer tous les scenarios roaming / Wi-Fi / dual SIM
- embarquer d'emblee un billing temps reel complexe

## Hypothese produit de depart

Le point de depart le plus realiste est:

- sponsoring data limite a l'application mobile Oniix
- sur une liste restreinte de chaines ou bouquets
- pour des abonnes / offres Celtiis clairement identifies
- avec une fenetre pilote bornee dans le temps

## Principes de mise en oeuvre

### 1. Tout le playback mobile doit passer par Oniix

Il ne faut pas exposer ou contourner la media gateway.

Celtiis doit pouvoir identifier sans ambiguite:

- le domaine de playback
- les chemins de lecture
- les IP egress
- la nature du trafic concerne

### 2. Le sponsoring doit etre decide par session

Une session doit pouvoir etre marquee:

- `eligible`
- `sponsored`
- `not_eligible`
- `partner_bypass`
- `operator_unavailable`

### 3. Il faut separer l'usage produit et l'usage settlement

Les analytics produit ne suffisent pas.

Il faut une couche de donnees dediee pour:

- le volume sponsorise
- le temps de lecture sponsorise
- le nombre de sessions sponsorisees
- la ventilation par chaine / tenant / offre / operateur

### 4. Il faut un runbook d'incident commun

Au minimum:

- erreur d'entitlement
- indisponibilite media gateway
- ecart entre volume mesure et volume facture
- route operateur indisponible

## Backlog specifique Celtiis

### Phase 1 - Readiness technique

- industrialiser la media gateway
- figer `media.oniix.space` ou un hostname equivalent
- documenter les IP egress et les routes de playback
- ajouter un `operator correlation id` par session
- ajouter des dashboards playback dedies au pilote

### Phase 2 - Modele metier Celtiis

- ajouter `operator_accounts`
- creer `Celtiis Benin` comme premier operateur
- ajouter `operator_offers`
- ajouter `sponsorship_policies`
- ajouter un mode `pilot scoped` pour limiter le perimetre

### Phase 3 - Decisioning

- enrichir `POST /api/mobile/playback-url`
- enregistrer la decision de sponsoring
- lier la decision a `tenant_id`, `channel_id`, `playback_session_id`
- journaliser tous les refus et degradations

### Phase 4 - Reporting

- vue journal de sessions sponsorisees
- exports quotidiens / hebdomadaires
- repartition par chaine
- repartition par tenant
- volume et watch time sponsorises

### Phase 5 - Pilot operations

- dashboard pilote Celtiis
- journal des incidents
- runbook support
- checklist de go-live

## Points a clarifier avec Celtiis en amont

### Metier / commercial

- quel type exact de sponsoring est vise
- qui finance la data sponsorisee
- sur quelles chaines ou quels bouquets
- sur quelles offres clients Celtiis
- sur quelle zone geographique ou segment de clientele

### Technique

- le sponsoring repose-t-il sur:
  - whitelisting domaine / IP
  - classification DPI / policy reseau
  - API operator interne
  - une exposition Open Gateway / CAMARA
- quel est le niveau de logs / reporting attendu
- quelle est la frequence d'export attendue

### Juridique / compliance

- quelles mentions doivent etre presentes dans l'app et la console
- quelles contraintes privacy s'appliquent
- quelles donnees peuvent etre partagees avec l'operateur

## Positionnement Oniix recommande face a Celtiis

Oniix ne doit pas se presenter comme:

- un simple lecteur video
- un POC artisanal
- une solution purement console

Oniix doit se presenter comme:

- une plateforme OTT SaaS multi-tenant
- avec playback securise
- avec analytics live et historiques
- avec media gateway maitrisee
- et une feuille de route credible vers un pilote de sponsoring data

## Definition of done du pilote Celtiis

Le pilote peut etre considere comme serieusement pret quand:

- une chaine test est lue uniquement via la media gateway Oniix
- chaque session recupere une decision de sponsoring tracee
- le volume sponsorise est exportable
- le dashboard de suivi pilote existe
- les incidents critiques ont un runbook
- Oniix et Celtiis valident ensemble la procedure de verification
