#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${IDENTUS_INFRA_DIR:-"$ROOT_DIR/.identus"}"
CLOUD_AGENT_DIR="$INFRA_DIR/cloud-agent"
MEDIATOR_DIR="$INFRA_DIR/mediator"

CLOUD_AGENT_REPO="${IDENTUS_CLOUD_AGENT_REPO:-https://github.com/hyperledger-identus/cloud-agent.git}"
MEDIATOR_REPO="${IDENTUS_MEDIATOR_REPO:-https://github.com/hyperledger-identus/mediator.git}"

CLOUD_AGENT_VERSION="${IDENTUS_CLOUD_AGENT_VERSION:-2.0.0}"
PRISM_NODE_VERSION="${IDENTUS_PRISM_NODE_VERSION:-2.6.0}"
MEDIATOR_VERSION="${IDENTUS_MEDIATOR_VERSION:-1.2.1}"

CLOUD_AGENT_PORT="${IDENTUS_CLOUD_AGENT_PORT:-8000}"
CLOUD_AGENT_PG_PORT="${IDENTUS_CLOUD_AGENT_PG_PORT:-5432}"
CLOUD_AGENT_NAME="${IDENTUS_CLOUD_AGENT_NAME:-flighttix}"
CLOUD_AGENT_URL="${CLOUD_AGENT_URL:-http://localhost:${CLOUD_AGENT_PORT}/cloud-agent}"

MEDIATOR_PORT="${IDENTUS_MEDIATOR_PORT:-8080}"
MEDIATOR_MONGO_PORT="${IDENTUS_MEDIATOR_MONGO_PORT:-27017}"
MEDIATOR_COMPOSE_PROJECT="${IDENTUS_MEDIATOR_COMPOSE_PROJECT:-flighttix-mediator}"
MEDIATOR_URL="${NEXT_PUBLIC_MEDIATOR_URL:-http://localhost:${MEDIATOR_PORT}}"
MEDIATOR_SERVICE_ENDPOINTS="${IDENTUS_MEDIATOR_SERVICE_ENDPOINTS:-${MEDIATOR_URL};ws://localhost:${MEDIATOR_PORT}/ws}"

command_name="${1:-help}"

host_ip() {
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}'
    return
  fi

  if command -v route >/dev/null 2>&1 && command -v ipconfig >/dev/null 2>&1; then
    local interface
    interface="$(route get default | awk '/interface:/ {print $2; exit}')"
    ipconfig getifaddr "$interface"
    return
  fi

  printf '127.0.0.1\n'
}

clone_or_update() {
  local repo="$1"
  local dir="$2"

  mkdir -p "$INFRA_DIR"
  if [[ -d "$dir/.git" ]]; then
    git -C "$dir" fetch --tags --prune
    return
  fi

  git clone "$repo" "$dir"
}

bootstrap() {
  clone_or_update "$CLOUD_AGENT_REPO" "$CLOUD_AGENT_DIR"
  clone_or_update "$MEDIATOR_REPO" "$MEDIATOR_DIR"
}

write_cloud_agent_env() {
  local env_file="$CLOUD_AGENT_DIR/infrastructure/local/.env-${CLOUD_AGENT_NAME}"

  cat > "$env_file" <<EOF
API_KEY_ENABLED=false
AGENT_VERSION=${CLOUD_AGENT_VERSION}
PRISM_NODE_VERSION=${PRISM_NODE_VERSION}
PORT=${CLOUD_AGENT_PORT}
NETWORK=identus
VAULT_DEV_ROOT_TOKEN_ID=root
PG_PORT=${CLOUD_AGENT_PG_PORT}
EOF

  printf '%s\n' "$env_file"
}

start_mediator() {
  bootstrap
  local compose_args=(-f "$MEDIATOR_DIR/docker-compose.yml")
  if [[ "$MEDIATOR_PORT" != "8080" || "$MEDIATOR_MONGO_PORT" != "27017" ]]; then
    local override_file="$MEDIATOR_DIR/flighttix-compose.override.yml"
    cat > "$override_file" <<EOF
services:
  mongo:
    ports: !override
      - "${MEDIATOR_MONGO_PORT}:27017"
  identus-mediator:
    ports: !override
      - "${MEDIATOR_PORT}:8080"
EOF
    compose_args+=(-f "$override_file")
  fi

  (
    cd "$MEDIATOR_DIR"
    MEDIATOR_VERSION="$MEDIATOR_VERSION" \
    SERVICE_ENDPOINTS="$MEDIATOR_SERVICE_ENDPOINTS" \
      docker compose -p "$MEDIATOR_COMPOSE_PROJECT" "${compose_args[@]}" up -d
  )
}

start_cloud_agent() {
  bootstrap
  local env_file
  env_file="$(write_cloud_agent_env)"
  "$CLOUD_AGENT_DIR/infrastructure/local/run.sh" \
    -n "$CLOUD_AGENT_NAME" \
    -b \
    -w \
    -e "$env_file" \
    -p "$CLOUD_AGENT_PORT" \
    -d "$(host_ip)"
}

health() {
  printf 'Mediator health: '
  curl -fsS "${MEDIATOR_URL}/health" >/dev/null
  printf 'ok\n'

  printf 'Mediator version: '
  curl -fsS "${MEDIATOR_URL}/version"
  printf '\n'

  printf 'Mediator DID: '
  curl -fsS "${MEDIATOR_URL}/did" | sed 's/$/\n/'

  printf 'Mediator OOB invitation: '
  curl -fsS "${MEDIATOR_URL}/invitationOOB" | sed 's/$/\n/'

  printf 'Cloud Agent health: '
  curl -fsS "${CLOUD_AGENT_URL}/_system/health"
  printf '\n'
}

stop_mediator() {
  if [[ -d "$MEDIATOR_DIR" ]]; then
    local compose_args=(-f "$MEDIATOR_DIR/docker-compose.yml")
    if [[ -f "$MEDIATOR_DIR/flighttix-compose.override.yml" ]]; then
      compose_args+=(-f "$MEDIATOR_DIR/flighttix-compose.override.yml")
    fi
    docker compose -p "$MEDIATOR_COMPOSE_PROJECT" "${compose_args[@]}" down
  fi
}

stop_cloud_agent() {
  if [[ -x "$CLOUD_AGENT_DIR/infrastructure/local/stop.sh" ]]; then
    "$CLOUD_AGENT_DIR/infrastructure/local/stop.sh" -n "$CLOUD_AGENT_NAME"
  fi
}

case "$command_name" in
  bootstrap)
    bootstrap
    ;;
  start)
    start_mediator
    start_cloud_agent
    health
    ;;
  start-mediator)
    start_mediator
    ;;
  start-cloud-agent)
    start_cloud_agent
    ;;
  health)
    health
    ;;
  stop)
    stop_cloud_agent
    stop_mediator
    ;;
  stop-mediator)
    stop_mediator
    ;;
  stop-cloud-agent)
    stop_cloud_agent
    ;;
  *)
    cat <<'EOF'
Usage: bash scripts/identus-infra.sh <command>

Commands:
  bootstrap          Clone/update official Cloud Agent and Mediator repos under .identus/
  start              Start mediator, start single Cloud Agent, then run health checks
  start-mediator     Start only the mediator
  start-cloud-agent  Start only the single Cloud Agent
  health             Check mediator and Cloud Agent health endpoints
  stop               Stop Cloud Agent and mediator
  stop-mediator      Stop only the mediator
  stop-cloud-agent   Stop only the Cloud Agent
EOF
    ;;
esac
