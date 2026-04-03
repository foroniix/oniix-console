# Frontend Public Architecture

## Problem

Le front public est encore trop route-driven et trop local:

- chaque page recree ses propres `StatCard`, headers, cards et surfaces
- les visuels sont geres via des `backgroundImage` inline partout
- les fallbacks media ne sont pas centralises
- les thumbnails, posters, backdrops et logos n ont pas de contrat commun
- les routes clientes portent a la fois layout, composition, logique media et logique metier

Resultat:

- maintenance couteuse
- regressions visuelles faciles
- comportement media incoherent
- front difficile a simplifier proprement

## Target

L architecture cible du public doit etre feature-first, media-first et component-driven.

```text
src/
  app/we/
    ...routes fines, metadata et composition minimale
  features/web-viewer/
    media/
      media.constants.ts
      media.utils.ts
      media-thumb.tsx
    ui/
      section-header.tsx
      stat-card.tsx
      panel.tsx
      tabs.tsx
    home/
      components/
      hooks/
      types.ts
    live/
      components/
      hooks/
      types.ts
    catalog/
      components/
      hooks/
      types.ts
    replay/
      components/
      hooks/
      types.ts
    shared/
      formatters.ts
      media-selectors.ts
      content-types.ts
```

## Rules

### 1. Route files stay thin

Les fichiers sous `src/app/we/**` ne doivent plus contenir de gros composants locaux. Ils doivent:

- resoudre params et metadata
- monter un client feature
- deleguer la composition au dossier `features/web-viewer`

### 2. Shared UI primitives are mandatory

Tout bloc reutilise au moins deux fois doit sortir des pages:

- section headers
- stat cards
- surface panels
- chips
- empty states
- rails et cards

### 3. Media has one entry point

Tous les visuels publics passent par la couche `features/web-viewer/media`.

Elle doit gerer:

- URL vide
- fallback de type live / replay / poster / backdrop
- `cover` vs `contain`
- etiquette `alt`
- fallback visuel si l image casse

Interdiction de recreer du `backgroundImage: url(...)` inline dans les pages, sauf cas exceptionnel documente.

### 4. Media selection stays deterministic

Les priorites visuelles doivent etre fixes:

- live card: `stream.poster -> slot.poster -> live fallback`
- replay card: `replay.poster -> replay fallback`
- title stage: `episode.thumbnail -> episode.poster -> title.backdrop -> title.poster -> hero fallback`
- poster card: `poster -> backdrop -> poster fallback`
- logo badge: `logo -> initials fallback`

### 5. Styling tokens stay centralized

Les rayons, surfaces et tons ne doivent pas etre reinvente page par page.
On garde:

- un shell global
- des panels reusables
- des cards reusables
- une hierarchie stable de spacing

### 6. Pages become compositions of blocks

Chaque surface doit etre composee de blocs stables:

- Home: hero stage, quick actions, rails, filters
- Live viewer: player stage, playback meta, channel rail, replay rail
- Catalog home: hero stage, search/filter bar, continue rail, title rails
- Title page: stage, actions, meta, seasons/episodes
- Replay page: player stage, playback meta, related rail

## Migration order

1. Centraliser media + UI primitives
2. Extraire home
3. Extraire live viewer
4. Extraire catalog home
5. Extraire title page
6. Extraire replay page

## Immediate changes applied

Cette base a deja ete posee:

- `features/web-viewer/ui/section-header.tsx`
- `features/web-viewer/ui/stat-card.tsx`
- `features/web-viewer/ui/panel.tsx`
- `features/web-viewer/media/media.constants.ts`
- `features/web-viewer/media/media.utils.ts`
- `features/web-viewer/media/media-thumb.tsx`

## Next refactor to apply

- generaliser `MediaThumb` sur home et catalog home pour supprimer les derniers fonds inline residuels si d autres reviennent
- sortir les cartes live, replay, catalog et episode dans des composants feature dedies
- etendre `Panel` et les primitives shell aux surfaces home et catalog
