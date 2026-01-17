# Configuration et secrets

## Configuration locale
- Copier `.env.local.example` vers `.env.local`.
- Renseigner chaque variable via le gestionnaire de secrets.
- Ne jamais committer `.env.local`.

## Rotation des secrets (checklist)
- Supabase: rotation des cles `service_role` et `anon`, puis mise a jour des environnements.
- Revoquer les sessions actives si un acces est suspecte.
- Verifier les URLs publiques et les redirections autorisees.
- Confirmer que les anciens secrets ne sont plus presents dans l'historique Git.

## Garde-fous
- CI: scan automatique des secrets a chaque PR et push.
- Pre-commit (recommande): activer un hook de scan de secrets en local.

## Multi-tenant
- Voir `docs/TENANCY.md` pour l'alignement RLS et la source de verite du tenant.
