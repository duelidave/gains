# Build and deploy locally for testing

Build local Docker images (tagged `:dev`) and restart containers. Does NOT overwrite the official ghcr.io images.

## Steps

1. Build local images using the dev compose file:
   ```
   docker compose -f docker-compose.yml -f docker-compose.dev.yml build
   ```

2. Stop the current containers and start with locally-built images. If `docker-compose.override.yml` exists (production server with Traefik), include it:
   ```
   # With override (production server):
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.override.yml up -d

   # Without override (local dev):
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

3. Show running container status to confirm the deploy worked.

4. Tell the user the local dev build is running and remind them to run `docker compose pull && docker compose up -d` to switch back to the official images when done testing.
