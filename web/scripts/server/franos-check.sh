#!/usr/bin/env bash
# Runs on the server every two minutes. Asks franOS for its sign-in page, which also needs the database.
# Three misses in a row (about six minutes) and the owner is emailed once; again when it is back.
# franOS restarts by itself after a crash, so an email means it did not recover on its own.
set -uo pipefail
set -a
. /etc/franos/env
set +a
state=/var/lib/franos-check
mkdir -p "$state"
misses="$(cat "$state/misses" 2>/dev/null || echo 0)"

if curl -fs -o /dev/null --max-time 20 http://127.0.0.1:3000/login; then
  if [ -f "$state/alerted" ]; then
    node /usr/local/lib/franos/franos-alert.cjs "franOS is back" "franOS on the server is answering again." && rm -f "$state/alerted"
  fi
  echo 0 > "$state/misses"
else
  misses=$((misses + 1))
  echo "$misses" > "$state/misses"
  if [ "$misses" -ge 3 ] && [ ! -f "$state/alerted" ]; then
    node /usr/local/lib/franos/franos-alert.cjs "franOS is not answering" "franOS on the server has not answered for about six minutes and has not recovered by itself. Leads cannot sign up or book until it is back. Ask Claude to look at it." && touch "$state/alerted"
  fi
fi
