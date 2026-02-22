# GAINS

**Gym App I Never Should've built.**

> AI-powered workout tracking with natural language input. Built entirely by Claude.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/duelidave/gains?color=orange)](https://github.com/duelidave/gains/releases)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Built by Claude](https://img.shields.io/badge/Built%20by-Claude-cc785c?logo=anthropic&logoColor=white)](https://claude.ai)

---

## About

GAINS is a self-hosted fitness tracker that lets you log workouts in natural language. Just type "Bankdrücken 5x5 80kg" and the AI parses it into structured data. No tedious form-filling required.

**This entire application — backend, frontend, infrastructure, documentation — was built by [Claude](https://claude.ai), Anthropic's AI assistant.** A human provided direction and review; Claude wrote the code.

## Features

- **Natural language workout logging** — describe your workout in plain text and AI parses it into structured data (powered by Claude API)
- **Progress tracking** — automatic PR detection, estimated 1RM (Epley), and historical charts
- **Smart exercise matching** — AI normalizes exercise names against your history to prevent duplicates
- **Last workout reference** — see what you did last time while logging a new session
- **Flexible auth** — local accounts, Keycloak, or any OIDC provider (Google, GitHub, Authentik, etc.)
- **Self-hosted** — runs on your own hardware via Docker, your data stays yours

## Supported Workout Types

| Type | Examples | Tracked Data |
|------|----------|-------------|
| **Strength** | Bench Press, Squats, Deadlift | Sets x Reps @ Weight |
| **Bodyweight** | Dips, Pull-ups, Push-ups | Sets x Reps |
| **Timed** | Plank, Wall Sit, Dead Hang | Duration |
| **Cardio** | Running, Swimming, Rowing | Duration + Distance |
| **Flexibility** | Stretching, Yoga | Duration |

All types support natural language input — just describe your workout and the AI parses it.

## Quick Start

```bash
git clone https://github.com/duelidave/gains.git
cd gains
cp .env.example .env
# Edit .env with your settings (defaults work out of the box for local auth)
docker compose up -d
```

This pulls pre-built images from GitHub Container Registry and starts the app. No build step needed.

The app starts in **local auth mode** by default — the simplest setup. Users register with email and password, no external auth provider needed.

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api

> **Note:** To enable AI-powered workout parsing, add your [Anthropic API key](https://console.anthropic.com/) to `.env`. The app works without it, but natural language parsing will be disabled.

### Docker Images

Pre-built images are published to GitHub Container Registry:

```
ghcr.io/duelidave/gains-backend:latest
ghcr.io/duelidave/gains-frontend:latest
```

To build from source instead:

```bash
docker compose up -d --build
```

## Configuration

All configuration is done through environment variables in the `.env` file. See [`.env.example`](.env.example) for the full template.

### General

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend API port (inside container) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

### Database

| Variable | Default | Description |
|---|---|---|
| `MONGO_ROOT_USERNAME` | `admin` | MongoDB root username |
| `MONGO_ROOT_PASSWORD` | — | MongoDB root password |
| `MONGO_URI` | — | Full MongoDB connection string |

### Authentication

| Variable | Default | Description |
|---|---|---|
| `AUTH_PROVIDER` | `local` | Auth mode: `local`, `keycloak`, or `oidc` |
| `JWT_SECRET` | — | Secret for signing JWTs (required for local/oidc) |
| `ALLOW_REGISTRATION` | `true` | Allow new user sign-ups |

### Keycloak (only when `AUTH_PROVIDER=keycloak`)

| Variable | Description |
|---|---|
| `KEYCLOAK_URL` | Internal Keycloak URL (e.g., `http://keycloak:8080`) |
| `KEYCLOAK_REALM` | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | Keycloak client ID |
| `KEYCLOAK_PUBLIC_URL` | Public-facing Keycloak URL |

### Generic OIDC (only when `AUTH_PROVIDER=oidc`)

| Variable | Description |
|---|---|
| `OIDC_ISSUER_URL` | OIDC issuer URL (e.g., `https://accounts.google.com`) |
| `OIDC_CLIENT_ID` | OAuth client ID |
| `OIDC_CLIENT_SECRET` | OAuth client secret |
| `OIDC_SCOPES` | Scopes to request (default: `openid profile email`) |

### AI Features

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Anthropic API key (optional — enables AI workout parsing) |

## Auth Providers

### Local (default)

The simplest option. Users register and log in with email and password. No external services required.

```env
AUTH_PROVIDER=local
JWT_SECRET=your-random-secret-here
ALLOW_REGISTRATION=true
```

Generate a strong JWT secret:
```bash
openssl rand -base64 48
```

### Keycloak

For organizations with existing Keycloak infrastructure.

```env
AUTH_PROVIDER=keycloak
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=fitness
KEYCLOAK_CLIENT_ID=gains
KEYCLOAK_PUBLIC_URL=https://auth.example.com
```

### Generic OIDC (Google, GitHub, Authentik, etc.)

Use any OpenID Connect provider. Example with Google:

```env
AUTH_PROVIDER=oidc
OIDC_ISSUER_URL=https://accounts.google.com
OIDC_CLIENT_ID=your-client-id.apps.googleusercontent.com
OIDC_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-random-secret-here
```

## Reverse Proxy (Traefik, nginx, etc.)

The default `docker-compose.yml` exposes ports directly for local development. For production behind a reverse proxy, remove the `ports` mappings and add your proxy labels/config. See [docs/reverse-proxy.md](docs/reverse-proxy.md) for examples.

## Development

### Prerequisites

- Docker and Docker Compose, **or**
- Node.js 20+ and MongoDB 7+

### With Docker (recommended)

```bash
cp .env.example .env
docker compose up -d --build
```

### Without Docker

```bash
# Start MongoDB locally, then:

# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS 4, Vite, Recharts, i18next
- **Backend:** Express, TypeScript, Mongoose, Zod
- **Database:** MongoDB 7
- **Auth:** JWT (local), Keycloak, OIDC (via jose/jwks-rsa)
- **AI:** Anthropic Claude API
- **Infrastructure:** Docker, Docker Compose

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) — David Mueller

---

*Built entirely by [Claude](https://claude.ai). A human provided direction; AI wrote the code.*
