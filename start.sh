#!/usr/bin/env bash
# Start Invite Studio.
#   ./start.sh            start web + worker (+ tunnel if ngrok is configured) with pm2 and stay open showing live logs
#                         (Ctrl+C or closing the terminal stops everything)
#   ./start.sh --detach   same, but return to the prompt and keep running in the background
#   ./start.sh --build    force a rebuild first (use after pulling updates)
#   ./start.sh --dev      run web + worker in the foreground in dev mode (Ctrl+C stops both)
#   ./start.sh --stop     stop everything started by this script
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

MODE=prod
FORCE_BUILD=0
DETACH=0
for arg in "$@"; do
  case "$arg" in
    --dev) MODE=dev ;;
    --build) FORCE_BUILD=1 ;;
    --detach) DETACH=1 ;;
    --stop) MODE=stop ;;
    -h|--help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 1 ;;
  esac
done

if [ "$MODE" = stop ]; then
  npx pm2 delete ecosystem.config.cjs
  exit 0
fi

# env value from .env (ignores comments, strips quotes/CR)
env_val() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '\r"'"'" || true; }

# ---- prerequisites ----
command -v node >/dev/null || { echo "Node.js 20.9+ is required (https://nodejs.org)." >&2; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>20||(a===20&&b>=9)?0:1)' \
  || { echo "Node $(node -v) is too old; need 20.9 or newer." >&2; exit 1; }
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null \
  || { echo "ffmpeg/ffprobe not found on PATH (Windows: winget install Gyan.FFmpeg)." >&2; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Fill in ADMIN_PASSWORD, SIGNING_SECRET and your LLM key, then run ./start.sh again." >&2
  exit 1
fi
if [ -z "$(env_val SIGNING_SECRET)" ] || { [ -z "$(env_val ADMIN_PASSWORD)" ] && [ -z "$(env_val ADMIN_PASSWORD_HASH)" ]; }; then
  echo "Set SIGNING_SECRET and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) in .env first." >&2
  exit 1
fi
PROVIDER="$(env_val LLM_PROVIDER)"; PROVIDER="${PROVIDER:-anthropic}"
if [ "$PROVIDER" = anthropic ] && [ -z "$(env_val ANTHROPIC_API_KEY)" ]; then
  echo "Warning: LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is empty; orders will fail at the parse step." >&2
fi

# ---- install / build ----
[ -d node_modules ] || npm install

if [ "$MODE" = dev ]; then
  trap 'kill 0' EXIT INT TERM
  npm run dev:web &
  npm run dev:worker &
  wait
  exit 0
fi

if [ "$FORCE_BUILD" = 1 ] || [ ! -f apps/web/.next/BUILD_ID ]; then
  npm run build
fi

# ---- start with pm2 ----
# The tunnel exits immediately without ngrok credentials, so only include it when they are set.
APPS="web,worker"
if [ -n "$(env_val NGROK_AUTHTOKEN)" ] && [ -n "$(env_val NGROK_DOMAIN)" ]; then
  APPS="web,worker,tunnel"
else
  echo "NGROK_AUTHTOKEN/NGROK_DOMAIN not set: starting without the public tunnel."
fi

npx pm2 delete ecosystem.config.cjs >/dev/null 2>&1 || true
npx pm2 start ecosystem.config.cjs --only "$APPS"
echo
echo "Invite Studio is running: http://localhost:3000"

if [ "$DETACH" = 1 ]; then
  npx pm2 status
  echo "Logs: npm run pm2:logs   |   Stop: ./start.sh --stop"
  exit 0
fi

# Stay attached: stream logs, and stop all apps when this terminal session ends.
stop_all() { trap - EXIT INT TERM; echo; echo "Stopping Invite Studio..."; npx pm2 delete ecosystem.config.cjs >/dev/null 2>&1 || true; exit 0; }
trap stop_all EXIT INT TERM
echo "Showing live logs. Press Ctrl+C to stop everything."
npx pm2 logs --lines 20 || true
