# Configuration et secrets

## Configuration locale
- Copier `.env.local.example` vers `.env.local`.
- Renseigner chaque variable via le gestionnaire de secrets.
- Ne jamais committer `.env.local`.

## Rotation des secrets (checklist)
- Supabase: rotation des clés `service_role` et `anon`, puis mise à jour des environnements.
- Révoquer les sessions actives si un accès est suspecté.
- Vérifier les URLs publiques et les redirections autorisées.
- Confirmer que les anciens secrets ne sont plus présents dans l'historique Git.

## Garde-fous
- CI: scan automatique des secrets à chaque PR et push.
- Pre-commit (recommandé): activer un hook de scan de secrets en local.
