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

If you already pushed an image such as `your-registry/textura:latest`, update
`docker-compose.prod.yml` first:

```yaml
image: your-registry/textura:latest
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

## Tencent Cloud TCR workflow

Use `docker-compose.tcr.yml` on the server when the application image is pushed
to Tencent Cloud TCR instead of being built from source on the server.

### Server bootstrap

```bash
cp .env.tcr.example .env.tcr
chmod +x scripts/update-from-tcr.sh
./scripts/update-from-tcr.sh docker-compose.tcr.yml .env.tcr
```

Set `TEXTURA_IMAGE` in `.env.tcr` to your real TCR image path, for example:

```bash
TEXTURA_IMAGE=ccr.ccs.tencentyun.com/textura/me:latest
```

### Local build and push

```bash
chmod +x scripts/build-and-push.sh
TCR_REGISTRY=ccr.ccs.tencentyun.com \
TCR_NAMESPACE=textura \
TCR_REPOSITORY=me \
TCR_USERNAME=your-tcr-username \
TCR_PASSWORD=your-tcr-password \
./scripts/build-and-push.sh
```

### GitHub Actions secrets

Configure these repository secrets before enabling
`.github/workflows/docker-tcr.yml`:

- `TCR_REGISTRY`
- `TCR_NAMESPACE`
- `TCR_REPOSITORY`
- `TCR_USERNAME`
- `TCR_PASSWORD`
- `LIGHTHOUSE_HOST`
- `LIGHTHOUSE_USER`
- `LIGHTHOUSE_SSH_KEY`
- `LIGHTHOUSE_PORT`
- `LIGHTHOUSE_DEPLOY_PATH`
