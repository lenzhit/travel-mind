#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

for command in docker pnpm curl; do
  command -v "$command" >/dev/null || { echo "Falta $command en PATH." >&2; exit 1; }
done

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  chmod 600 .env.local
fi

for expected in APP_MODE=demo TRAVEL_PROVIDER=mock PAYMENT_PROVIDER=mock EMAIL_PROVIDER=mailpit WHATSAPP_PROVIDER=mock; do
  name=${expected%%=*}
  if grep -q "^$name=" .env.local && ! grep -Fxq "$expected" .env.local; then
    echo "La demo requiere $expected o el valor predeterminado de .env.example." >&2
    exit 1
  fi
done

pnpm workflows:setup
docker compose --profile ai up -d postgres mailpit n8n ollama

for attempt in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres -d travelmind >/dev/null 2>&1; then break; fi
  [ "$attempt" -lt 30 ] || { echo "PostgreSQL no respondió." >&2; exit 1; }
  sleep 1
done
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:5678/healthz >/dev/null 2>&1; then break; fi
  [ "$attempt" -lt 30 ] || { echo "n8n no respondió." >&2; exit 1; }
  sleep 1
done

pnpm db:migrate
pnpm db:seed

for model in qwen2.5:1.5b-instruct-q4_1 nomic-embed-text:v1.5; do
  if ! docker exec travelmind-ollama ollama list | grep -Fq "$model"; then
    echo "Descargando modelo local gratuito $model; puede tardar en la primera ejecución."
    docker exec travelmind-ollama ollama pull "$model" || echo "No se pudo descargar $model; continúa el catálogo determinista." >&2
  fi
done
if docker exec travelmind-ollama ollama list | grep -Fq 'nomic-embed-text:v1.5'; then
  pnpm rag:index --embed
else
  pnpm rag:index
fi

active_workflows=$(docker exec travelmind-n8n n8n list:workflow --active=true --onlyId)
workflow_changed=false
for workflow in maintenance consultation quotation reservation notifications exception_handling; do
  if ! grep -Fxq "travelmind-$workflow" <<< "$active_workflows"; then
    docker exec travelmind-n8n n8n import:workflow --input="/workflows/wf_$workflow.json"
    docker exec travelmind-n8n n8n publish:workflow --id="travelmind-$workflow"
    workflow_changed=true
  fi
done
if [ "$workflow_changed" = true ]; then
  docker compose restart n8n
fi

if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "TravelMind ya responde en http://127.0.0.1:3000."
  exit 0
fi

echo "TravelMind: http://127.0.0.1:3000 | Mailpit: http://127.0.0.1:8025 | n8n: http://127.0.0.1:5678"
echo "Ctrl+C detiene Next.js; los datos y servicios Docker permanecen intactos."
exec pnpm dev --hostname 127.0.0.1 --port 3000
