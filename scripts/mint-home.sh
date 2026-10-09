#!/usr/bin/env bash
# Mint a fresh LB2 token from a residential network and publish it to the app.
#
# elahmad.ru serves real LB2 streams to residential IPs and a static
# placeholder to datacenter networks (GitHub runners, Cloudflare, CI boxes),
# so this must run on a home/ISP machine — NOT a server. The token is written
# into the channel catalog, pages are rebuilt, and the change is pushed; the
# normal on:push deploy then rolls it out to Cloudflare Pages.
#
# The minted token is valid ~30 minutes, so run it on a short schedule, e.g.:
#   */20 * * * *  /opt/tv/scripts/mint-home.sh >> /opt/tv/mint.log 2>&1
#
# Requirements: git (push access to this repo), node >= 18, python3.
# If elahmad withholds a real token, the script exits cleanly and pushes nothing.
set -euo pipefail

cd "$(dirname "$0")/.."

node scripts/mint-token.mjs
python3 scripts/build.py

if ! git status --porcelain | grep -qE 'channels\.js|channels_canonical\.json|channel/'; then
  echo "$(date -Is) no token change; nothing to push."
  exit 0
fi

git add assets/channels.js assets/channels_canonical.json channel/
git commit -m "chore: refresh LB2 stream token (home)"
git push
echo "$(date -Is) refreshed LB2 token pushed."