# Reverse Proxy Setup

The default `docker-compose.yml` exposes ports directly. For production, you'll typically run GAINS behind a reverse proxy with TLS.

## Using docker-compose.override.yml

Create a `docker-compose.override.yml` next to your `docker-compose.yml`. Docker Compose merges it automatically.

### Traefik Example

```yaml
services:
  backend:
    ports: !reset []
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gains-backend.rule=Host(`fitness.example.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.gains-backend.entrypoints=websecure"
      - "traefik.http.routers.gains-backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.gains-backend.loadbalancer.server.port=4000"
    networks:
      default:
      proxy:

  frontend:
    ports: !reset []
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gains-frontend.rule=Host(`fitness.example.com`)"
      - "traefik.http.routers.gains-frontend.entrypoints=websecure"
      - "traefik.http.routers.gains-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.routers.gains-frontend.priority=1"
      - "traefik.http.services.gains-frontend.loadbalancer.server.port=3000"
    networks:
      proxy:

networks:
  proxy:
    external: true
```

Make sure to update `CORS_ORIGIN` in your `.env` to match your domain:

```env
CORS_ORIGIN=https://fitness.example.com
```

### nginx Example

If you're using nginx as a reverse proxy (outside Docker), point it at the exposed ports:

```nginx
server {
    listen 443 ssl;
    server_name fitness.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
