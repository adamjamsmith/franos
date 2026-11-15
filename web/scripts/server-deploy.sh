#!/usr/bin/env bash
# Puts the franOS on this computer onto the server and restarts it there.
#
#   bash scripts/server-deploy.sh                 code only
#   bash scripts/server-deploy.sh --settings      also refresh the server's settings from AWS Parameter Store
#   bash scripts/server-deploy.sh --settings --no-code   refresh the settings and restart, without sending code
#
# Run from the `web` folder. Needs the server's key (~/.ssh/franos_server) and, for --settings, an AWS login.
# The server keeps the previous version and goes back to it if the new one fails to build.
set -euo pipefail

SERVER="${FRANOS_SERVER:-ubuntu@16.192.105.23}"
ADDRESS="${FRANOS_ADDRESS:-https://refresh.franchiseright.co.uk}"
KEY="${FRANOS_SERVER_KEY:-$HOME/.ssh/franos_server}"
run() { ssh -i "$KEY" -o ConnectTimeout=20 "$SERVER" "$@"; }

if [ "${1:-}" = "--settings" ]; then
  # Passwords go straight from AWS to the server. Nothing is shown or kept on this computer.
  # The sign-in secret is made on the server the first time and never leaves it.
  node scripts/server-env.mjs "$ADDRESS" | run 'sudo sh -c "umask 077; cat > /etc/franos/env.new; [ -s /etc/franos/auth ] || echo BETTER_AUTH_SECRET=\$(openssl rand -hex 32) > /etc/franos/auth; cat /etc/franos/auth >> /etc/franos/env.new; mv /etc/franos/env.new /etc/franos/env"'
  echo "Settings updated."
fi
if [ "${2:-}" = "--no-code" ]; then
  run 'sudo systemctl restart franos && sleep 6 && curl -s -o /dev/null -w "franOS restarted and answers with: %{http_code}
" http://127.0.0.1:3000/login'
  exit 0
fi

# Send the code: everything git knows about plus new files, never ignored ones (.data, .env.local, node_modules).
git ls-files -co --exclude-standard -z | tar --null -czf - -T - | run 'sudo rm -rf /srv/franos/next && sudo mkdir -p /srv/franos/next && sudo tar -xzf - -C /srv/franos/next && sudo chown -R franos:franos /srv/franos/next'
echo "Code sent. Building on the server (a few minutes)..."

run 'set -e
sudo -u franos env HOME=/srv/franos sh -c "cd /srv/franos/next && npm ci --no-audit --no-fund --loglevel=error"
sudo -u franos env HOME=/srv/franos NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 sh -c "cd /srv/franos/next && npx next build" 2>&1 | tail -5
sudo systemctl stop franos 2>/dev/null || true
sudo rm -rf /srv/franos/previous
sudo test -d /srv/franos/app/.next && sudo mv /srv/franos/app /srv/franos/previous || sudo rm -rf /srv/franos/app
sudo mv /srv/franos/next /srv/franos/app
sudo systemctl start franos
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login || true)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "franOS answers on the server with: $code"
[ "$code" = "200" ]'
