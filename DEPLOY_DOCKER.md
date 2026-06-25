# Textura Docker Deployment

## Recommended package contents

Upload the project deployment archive to your server, then extract it:

```bash
tar -xzf textura-docker-deploy-*.tar.gz
cd textura
```

## Source-build deployment

This mode builds the image directly on the server:

```bash
chmod +x deploy.sh
./deploy.sh
```

Or run it manually:

```bash
docker compose -f docker-compose.yml up -d --build
```

## Prebuilt-image deployment

If you already pushed an image such as `ghcr.io/fxbin/textura:latest`, update
`docker-compose.prod.yml` first:

```yaml
image: ghcr.io/fxbin/textura:latest
```

Then deploy with:

```bash
chmod +x deploy.sh
./deploy.sh docker-compose.prod.yml
```

## Common commands

```bash
docker compose ps
docker compose logs -f
docker compose down
```

## Default port

The reverse proxy exposes port `80` by default. If the server already uses port
`80`, change the host-side port mapping in `docker-compose.yml` or
`docker-compose.prod.yml`.
