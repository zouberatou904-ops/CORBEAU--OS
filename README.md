# CORBEAU-OS

Première version de la plateforme Corbeau.

## Stack
- React + Vite
- Supabase Auth
- Supabase Database
- GitHub
- Vercel

## Installation
```bash
npm install
npm run dev
```

## Variables d'environnement
Copier `.env.example` vers `.env.local` et renseigner :

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Supabase
1. Ouvrir le SQL Editor.
2. Copier le contenu de `supabase/schema.sql`.
3. Exécuter le script.
4. Pour cette première version, activer l'authentification par téléphone dans Supabase si l'inscription par numéro doit être vérifiée par SMS.

## Important
Ne jamais mettre une `service_role` key dans le frontend.