#!/usr/bin/env bash
set -euo pipefail
revision="${1:?A commit SHA is required}"
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA'; exit 1; }
base=/opt/workshop/backend
cd "$base/releases/$revision"
export IMAGE_TAG="$revision"
export BACKEND_ENV_FILE="$base/backend.env"
export DATABASE_NETWORK="$(cat "$base/database-network" 2>/dev/null || printf '%s' workshop-network)"
test -r "$BACKEND_ENV_FILE" || { echo "Missing $BACKEND_ENV_FILE"; exit 1; }
exec 9>"$base/deploy.lock"
flock -w 600 9
# Keep the previous API running if the build or migration fails.
docker compose build --pull backend
docker compose run --rm --no-deps backend npm run migrate:up
if ! docker compose up -d --no-build --wait --wait-timeout 120 backend; then
  echo 'Deployment failed its health check. Inspect docker compose logs backend.'
  exit 1
fi
printf '%s\n' "$revision" > "$base/current-revision"
echo "Backend deployed successfully: $revision"
