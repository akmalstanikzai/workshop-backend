# Workshop backend

Express API backed by local PostgreSQL with local JWT authentication.

## Configuration

Copy `.env.example` to `.env`, set the local PostgreSQL connection and use a random `JWT_SECRET` of at least 32 characters. Run `npm run migrate:up` to create the database tables.

## API

All routes except health and login require `Authorization: Bearer <access token>`.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/users` (admin)
- `GET|POST /api/customers`, `GET|PATCH|DELETE /api/customers/:id`
- `POST /api/customers/:id/items`, `POST /api/customers/:id/parts`
- `GET|POST /api/workshop-jobs`, `GET|PATCH|DELETE /api/workshop-jobs/:id`
- `GET|POST /api/parts`, `GET|PATCH|DELETE /api/parts/:id`
- `GET|POST /api/part-sales`
- `GET|POST /api/payments`

The local schema mirrors the supplied design. User references point to the existing local `users` table, and a read-only `profiles` view provides the corresponding profile shape.

## Automatic deployment to Ubuntu

This backend folder is the Git repository. Push it to GitHub with the workflow at
`.github/workflows/deploy.yml`. Every push to `main` builds the committed backend
on your Ubuntu server, runs migrations, replaces the API container and waits for
`/api/health` to confirm both the API and database work. Manual runs are also available.
The frontend is deployed separately. PostgreSQL stays in its existing container.

### One-time server setup

1. Install Docker Engine and Docker Compose v2 supporting `up --wait`. The deploy
   user needs SSH access, permission to run Docker without sudo, and `flock`.
   Docker access is privileged; use a dedicated deployment account.
2. As an administrator, create `/opt/workshop/backend/releases` and give the deploy
   user ownership of `/opt/workshop/backend`.
3. Use a shared user-defined Docker network. For example, run once:

   ```sh
   docker network create workshop-network
   docker network connect --alias workshop-db workshop-network YOUR_DATABASE_CONTAINER
   ```

   Skip network creation if it exists. Persist this external network and alias in
   your database's own Compose configuration so database recreation preserves it.
   Alternatively, use its existing network: write that network name into
   `/opt/workshop/backend/database-network` and use its existing DNS alias in the URL.
4. Copy `deploy/backend.env.example` to `/opt/workshop/backend/backend.env` on the
   server, set the existing database credentials and your existing JWT secret,
   and restrict permissions with `chmod 600 /opt/workshop/backend/backend.env`.
   Use the database container's internal port (usually 5432), not its published
   host port. Never commit this file. A database hostname of `localhost` would
   refer to the API container itself.
5. Add the deployment SSH public key to the deploy user's `~/.ssh/authorized_keys`.
6. Create the GitHub environment `production` and configure these secrets there:

   | Secret | Value |
   | --- | --- |
   | `DEPLOY_HOST` | Server IP address or hostname |
   | `DEPLOY_USER` | SSH deployment username |
   | `DEPLOY_PORT` | Optional SSH port; defaults to 22 |
   | `DEPLOY_SSH_KEY` | Dedicated SSH private key, without a passphrase |
   | `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key entry for the server |

   Obtain the host key over a trusted connection and verify its fingerprint.
   For a custom SSH port, the known-hosts entry uses `[hostname]:port`.
   The server must accept SSH connections from the GitHub runner and have internet
   access to fetch the Node image and npm dependencies.
7. Before the first deployment, take a database backup and stop only the old
   backend container if it occupies port 5000. This setup creates a Compose-managed
   backend; it cannot automatically adopt an arbitrary existing container.
   Keep the old container available until the first deployment succeeds.
8. Push to `main`, then check the GitHub Actions deployment result.

The API is published at `127.0.0.1:5000` on the server. Configure a host-based Nginx
or Caddy reverse proxy to forward HTTPS traffic to it. A containerized proxy must
join a shared network and forward to `backend:5000` instead. Point the frontend at
that public HTTPS API address.

### Operations

Migrations run before replacement; use backward-compatible migrations because the
old API remains running during migration. A migration failure stops deployment.
A failed post-replacement health check marks the pipeline failed and needs operator
attention; there is no automatic database rollback or zero-downtime guarantee.

For logs, use the deployed release directory and the same environment file:

```sh
cd /opt/workshop/backend/releases/COMMIT_SHA
BACKEND_ENV_FILE=/opt/workshop/backend/backend.env docker compose logs --tail=100 backend
```

To redeploy an earlier retained release, run `bash deploy/deploy.sh COMMIT_SHA` from
that release directory, after checking schema compatibility. Successful revision
is saved in `/opt/workshop/backend/current-revision`. Releases and images are kept
for recovery; periodically clean up old ones after verifying they are unused.

The workspace-level `../compose.yaml` is a separate local development stack with
its own PostgreSQL service; it is not used by this production pipeline.

References: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
and [Docker Compose health waiting](https://docs.docker.com/reference/cli/docker/compose/up/).
