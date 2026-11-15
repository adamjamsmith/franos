#!/usr/bin/env bash
# Runs on the server, once (safe to run again). Installs the nightly backup and the "not answering" check.
# The files beside this one must already be in /tmp/franos-ops.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# The database is Postgres 18, so the copying tool must be 18 too. Ubuntu ships an older one.
if [ ! -x /usr/lib/postgresql/18/bin/pg_dump ]; then
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo "$VERSION_CODENAME")-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql-client-18 >/dev/null
fi
command -v aws >/dev/null || sudo snap install aws-cli --classic >/dev/null

sudo install -d -m 755 /usr/local/lib/franos
sudo install -m 644 /tmp/franos-ops/franos-alert.cjs /usr/local/lib/franos/franos-alert.cjs
sudo install -m 755 /tmp/franos-ops/franos-backup.sh /usr/local/lib/franos/franos-backup.sh
sudo install -m 755 /tmp/franos-ops/franos-check.sh /usr/local/lib/franos/franos-check.sh

unit() { sudo tee "/etc/systemd/system/$1" >/dev/null; }
unit franos-backup.service <<UNIT
[Unit]
Description=franOS nightly database backup
[Service]
Type=oneshot
ExecStart=/usr/local/lib/franos/franos-backup.sh
UNIT
unit franos-backup.timer <<UNIT
[Unit]
Description=franOS nightly database backup
[Timer]
OnCalendar=*-*-* 02:30:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
unit franos-check.service <<UNIT
[Unit]
Description=franOS is-it-answering check
[Service]
Type=oneshot
ExecStart=/usr/local/lib/franos/franos-check.sh
UNIT
unit franos-check.timer <<UNIT
[Unit]
Description=franOS is-it-answering check
[Timer]
OnBootSec=3min
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now franos-backup.timer franos-check.timer >/dev/null 2>&1
/usr/lib/postgresql/18/bin/pg_dump --version
aws --version | cut -d' ' -f1
systemctl list-timers --no-pager | grep franos | awk '{print $NF, "next:", $1, $2, $3}'
