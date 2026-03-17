# ADR 001 - Media Gateway Sans Cloudflare

- Statut: accepte
- Date: 2026-03-15

## Contexte

La plateforme Oniix doit servir des flux OTT a une application mobile et a une console SaaS multi-tenant.

Une premiere architecture basee sur un Worker Cloudflare existe encore dans le repo, mais elle n'est plus la cible retenue. Le besoin produit reste le meme:

- ne jamais exposer `origin_hls_url` au mobile
- controler l'acces au playback par tenant, chaine et session
- collecter des analytics live et QoE coherentes
- garder une separation nette entre control plane et data plane

## Decision

La cible officielle abandonne Cloudflare Worker.

Nous retenons une architecture en deux plans:

- `Next.js + Supabase` pour le control plane
- une `media gateway` dediee pour le playback HLS

## Architecture cible

```text
Mobile App
  -> API playback (session + authorisation)
  -> media gateway /hls/... (playlists, segments, keys)
  -> API analytics ingest / heartbeat

Console Next.js
  -> APIs admin
  -> Supabase Auth / Postgres / Realtime

Media Gateway
  -> validation token playback
  -> resolution origine
  -> rewrite HLS
  -> proxy playlists / segments / keys
  -> cache court
```

## Responsabilites

### Control plane

- auth et cookies `httpOnly`
- tenants, roles, memberships, invites
- channels, streams, programmation, replays
- supervision, incidents, analytics produit
- emission de tokens de playback courts

### Media gateway

- verification du token de lecture
- creation ou poursuite de session playback
- masquage complet de l'origine HLS
- reecriture des playlists master et media
- proxy des segments et des cles
- support `GET`, `HEAD` et `Range`
- journalisation technique exploitable

## Contraintes de conception

- Le mobile ne doit jamais appeler `origin_hls_url` directement.
- Les URLs de lecture doivent etre courtes, signees et revocables a l'echelle de la session.
- La gateway ne doit pas etre hebergee comme une simple route Next.js de console.
- Le hostname de streaming doit etre distinct du hostname console.

## Pourquoi pas une route Next.js classique

Une route Next.js/Vercel n'est pas la bonne surface pour servir durablement des playlists et segments HLS:

- exigences de debit et de latence differentes
- besoin de support `Range` et de proxy media stable
- besoin de cache plus fin cote streaming
- isolation operationnelle entre console admin et trafic playback

## Interfaces a stabiliser

### API playback

- entree: tenant, channel ou stream, device, contexte client
- sortie: URL de lecture signee, session id, metadata de lecture

### Analytics

- `session_start`
- `play`
- `pause`
- `buffer_start`
- `buffer_end`
- `heartbeat`
- `error`
- `session_end`

## Consequences

- `cloudflare/worker/` devient du legacy de reference, pas une cible de production.
- Les documents OTT qui parlent de Worker doivent etre interpretes comme historiques jusqu'a leur reecriture.
- Les prochaines decisions d'architecture doivent partir de cette separation:
  - console/admin
  - playback/media gateway
  - analytics ingest

## Migration

1. Conserver le control plane actuel.
2. Unifier le modele canonique playback / analytics.
3. Implementer la media gateway dediee.
4. Basculer le mobile sur l'API de playback unique.
5. Retirer progressivement les hypotheses Cloudflare de la documentation et du code legacy.
