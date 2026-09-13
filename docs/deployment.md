# Production deployment

The GitHub Actions workflow runs checks on pull requests. A push to `main`, or
a manual run from GitHub Actions, builds immutable API and web images, publishes
them to GitHub Container Registry (GHCR), then deploys those images to the VPS.

This guide assumes an Ubuntu 22.04 or 24.04 VPS, a domain name, and a user with
sudo access. Run the VPS commands as a sudo-capable user unless stated otherwise.

## 1. DNS and provider firewall

Create a DNS `A` record for your production domain, for example
`floofs.example.com`, pointing to the VPS public IPv4 address. Wait for it to
resolve before the first deployment; Caddy needs this to obtain a TLS certificate.

In the VPS provider firewall or security group, allow inbound TCP ports `22`,
`80`, and `443`. Do not expose the PostgreSQL, Redis, or API ports: Compose
keeps them inside its private Docker network.

## 2. Install Docker

Install Docker Engine and its Compose plugin from Docker's Ubuntu repository:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"${UBUNTU_CODENAME:-$VERSION_CODENAME}\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker --version
docker compose version
```

Configure the operating-system firewall after confirming that SSH access works:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 3. Create the deployment user

Use a dedicated non-root account for deployment and allow only that account to
control Docker:

```bash
sudo adduser --disabled-password --gecos "" floofs
sudo usermod -aG docker floofs
sudo install -d -o floofs -g floofs -m 0750 /opt/floofs
sudo -u floofs docker version
```

Log out and back in if the last command reports a Docker permission error. The
`docker` group is privileged, so do not add unrelated accounts to it.

## 4. Add the GitHub Actions SSH key

On a Windows PowerShell development machine, generate a dedicated deployment
key without a passphrase:

```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\floofs-github-actions" -C "floofs GitHub Actions"
```

Add the public key to the VPS. Replace `VPS_HOST` with the server address and
enter the VPS password when prompted:

```powershell
Get-Content "$HOME\.ssh\floofs-github-actions.pub" | ssh floofs@VPS_HOST "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
ssh -i "$HOME\.ssh\floofs-github-actions" floofs@VPS_HOST "docker compose version"
```

Store the contents of `$HOME\.ssh\floofs-github-actions` in GitHub as
`DEPLOY_SSH_KEY`. Never put this private key in the repository or the VPS `.env`
file.

## 5. Create the VPS environment file

Create `/opt/floofs/.env` on the VPS. It is server-only configuration and is
not transferred by the workflow:

```bash
sudo -u floofs nano /opt/floofs/.env
sudo chmod 600 /opt/floofs/.env
```

Use this template, replacing all example values with production values:

```env
APP_DOMAIN=floofs.example.com

POSTGRES_DB=floofs
POSTGRES_USER=floofs
POSTGRES_PASSWORD=use-a-long-unique-password
REDIS_PASSWORD=use-a-different-long-unique-password

WEB_APP_URL=https://floofs.example.com
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:notifications@example.com
RESEND_API_KEY=
RESEND_FROM=
AI_API_KEY=
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
SUPPORT_EMAIL=
```

Generate the VAPID keys once if push notifications are enabled:

```bash
npx web-push generate-vapid-keys
```

Put both generated VAPID values in the VPS `.env`; the public value also goes
in the `VITE_VAPID_PUBLIC_KEY` GitHub secret. The private VAPID key, database
passwords, and API provider keys must remain only on the VPS.

## 6. Create a GHCR pull token

Create a fine-grained personal access token for the GitHub account that owns
the repository. Grant it read-only access to the `floofs-api` and `floofs-web`
packages, or create a classic token with `read:packages`. This token lets the
VPS pull private container images. Store it as `GHCR_PULL_TOKEN` in GitHub;
do not add it to `/opt/floofs/.env`.

## 7. Configure GitHub

In the repository's **Settings > Environments**, create an environment named
`production`. Add these environment secrets:

| Secret                  | Value                                              |
| ----------------------- | -------------------------------------------------- |
| `DEPLOY_HOST`           | VPS IP address or DNS name                         |
| `DEPLOY_PATH`           | `/opt/floofs`                                      |
| `DEPLOY_PORT`           | SSH port, normally `22`                            |
| `DEPLOY_SSH_KEY`        | Contents of the deployment private key             |
| `DEPLOY_USER`           | `floofs`                                           |
| `GHCR_PULL_TOKEN`       | Package-read GitHub token                          |
| `VITE_VAPID_PUBLIC_KEY` | The public VAPID key, if notifications are enabled |

Protect the `production` environment with required reviewers if you want a
manual approval before every deployment. The first successful workflow run
creates the `floofs-api` and `floofs-web` GHCR packages. When they are private,
ensure the pull token can read both packages.

## 8. Run the first deployment

Open **Actions > CI and production deployment > Run workflow**, select `main`,
and run it. The workflow uploads `compose.production.yml` and `Caddyfile` to
`/opt/floofs`, logs the VPS into GHCR, pulls the built images, and starts the
services.

After it finishes, verify the VPS:

```bash
ssh floofs@VPS_HOST
cd /opt/floofs
docker compose --env-file .env -f compose.production.yml ps
docker compose --env-file .env -f compose.production.yml logs --tail=100 caddy web api
curl -I https://floofs.example.com
```

For later releases, merge or push changes to `main`. Pull requests run only the
checks; `main` deployments use the exact image tags created for that commit.

## Backups and operations

The Compose volumes retain PostgreSQL data, Redis data, uploaded files, and
Caddy certificates across container restarts. Volumes are not backups. Run a
regular PostgreSQL dump and copy it off the VPS:

```bash
sudo install -d -o floofs -g floofs -m 0750 /opt/floofs/backups
sudo -u floofs sh -c 'cd /opt/floofs && docker compose --env-file .env -f compose.production.yml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backups/floofs-$(date +%F).sql.gz'
```

When Prisma migrations are restored to the tracked API project, add `npx prisma
migrate deploy` as a release step before `docker compose ... up` in the deploy
job. Test each migration against a backup before deploying it to production.
