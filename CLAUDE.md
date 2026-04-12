# CLAUDE.md

## Project Overview

Fitness Tracker ("Gains") — a self-hosted workout tracking app with AI-powered chat interface.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS v4, i18next, React Router v6
- **Backend:** Node.js + TypeScript
- **Auth:** Keycloak (OIDC)
- **Infra:** Docker Compose, Traefik reverse proxy

## Development

Node.js is **not** installed on the host. All build/test commands must run inside the Docker container:

```sh
docker compose exec frontend npm run build
docker compose exec backend npm test
```

## UI Design System

When creating new components, pages, or UI elements, always use the project's design system at `frontend/design-system/`. Import tokens, primitives, and patterns from there instead of defining ad-hoc styles. The design system is the single source of truth for colors, spacing, typography, and component patterns.
