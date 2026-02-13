# Contributing to GAINS

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gains.git
   cd gains
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
4. Start the development environment:
   ```bash
   docker compose up -d
   ```
5. The app will be available at `http://localhost:3000` (frontend) and `http://localhost:4000` (backend API)

## Development Workflow

### Project Structure

```
gains/
├── backend/          # Express + TypeScript API
│   └── src/
│       ├── auth/     # Pluggable auth providers (local, keycloak, oidc)
│       ├── models/   # Mongoose models
│       ├── routes/   # Express route handlers
│       ├── services/ # Business logic layer
│       └── middleware/
├── frontend/         # React + TypeScript SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── i18n/     # Translations (en, de)
│       └── hooks/
└── docker-compose.yml
```

### Code Style

- **TypeScript** throughout (backend and frontend)
- **Tailwind CSS** for styling
- Use existing patterns in the codebase as reference
- Keep components small and focused

### Running Locally (without Docker)

If you prefer running outside Docker (requires Node.js 20+):

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

You'll need a MongoDB instance running locally or via Docker.

## Submitting Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes
3. Test that the app builds and runs correctly:
   ```bash
   docker compose up -d --build
   ```
4. Commit your changes with a clear message
5. Push to your fork and open a Pull Request

## Reporting Issues

- Use GitHub Issues to report bugs or suggest features
- Include steps to reproduce for bug reports
- Check existing issues before creating a new one

## Translations

GAINS supports multiple languages. To add a new language:

1. Copy `frontend/src/i18n/en.json` to a new file (e.g., `fr.json`)
2. Translate all strings
3. Register the new language in `frontend/src/i18n/index.ts`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
