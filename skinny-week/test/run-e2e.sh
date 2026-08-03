#!/usr/bin/env bash
# Builds the app, boots the mock devserver (real api/*.js handlers, fake
# Anthropic/Instacart upstreams), drives every button in a real headless
# browser, then tears the server down. See devserver.mjs and browser-check.mjs
# for what's actually being verified and why it's structured this way.
set -e
cd "$(dirname "$0")/.."

npm run build

pkill -f "test/devserver.mjs" 2>/dev/null || true
sleep 0.3
nohup node test/devserver.mjs 4180 > /tmp/skinny-week-devserver.log 2>&1 &
SERVER_PID=$!
disown

sleep 1.5
STATUS=0
node test/browser-check.mjs || STATUS=$?

kill "$SERVER_PID" 2>/dev/null || true
exit "$STATUS"
