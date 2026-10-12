#!/bin/sh
# Prepares the olympus checkout the export pushes to, then starts bacon.
# The deploy key arrives as an environment secret from Coolify and is only
# ever written inside the running container, never into the image.
set -eu

if [ -n "${OLYMPUS_DEPLOY_KEY:-}" ]; then
  mkdir -p "$HOME/.ssh"
  printf '%s\n' "$OLYMPUS_DEPLOY_KEY" > "$HOME/.ssh/id_ed25519"
  chmod 600 "$HOME/.ssh/id_ed25519"
fi

if [ -n "${OLYMPUS_REPO_URL:-}" ] && [ -n "${OLYMPUS_REPO_PATH:-}" ] && [ ! -d "$OLYMPUS_REPO_PATH/.git" ]; then
  git clone --quiet "$OLYMPUS_REPO_URL" "$OLYMPUS_REPO_PATH"
fi

exec node server.js
