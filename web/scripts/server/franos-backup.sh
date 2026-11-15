#!/usr/bin/env bash
# Runs on the server every night. Takes a full copy of the database and puts it in the private backup storage.
# If anything goes wrong, the owner is emailed.
set -uo pipefail
set -a
. /etc/franos/env
set +a
export AWS_ACCESS_KEY_ID="$(node -e 'process.stdout.write(JSON.parse(process.env.FRANOS_SES_CREDENTIALS).accessKeyId)')"
export AWS_SECRET_ACCESS_KEY="$(node -e 'process.stdout.write(JSON.parse(process.env.FRANOS_SES_CREDENTIALS).secretAccessKey)')"
export AWS_DEFAULT_REGION=eu-north-1

file="$(mktemp /var/tmp/franos-db.XXXXXX)"
trap 'rm -f "$file"' EXIT
name="db/franos-$(date -u +%Y-%m-%d).dump"

fail() {
  echo "Backup failed: $1"
  node /usr/local/lib/franos/franos-alert.cjs "franOS: the nightly backup failed" "The nightly database backup did not finish ($1). The previous backups are still there. Ask Claude to look at it." || true
  exit 1
}

/usr/lib/postgresql/18/bin/pg_dump --format=custom --dbname="$FRANOS_DATABASE_URL" --file="$file" 2>/dev/null || fail "could not copy the database"
tables="$(/usr/lib/postgresql/18/bin/pg_restore --list "$file" | grep -c 'TABLE DATA')"
[ "$tables" -ge 15 ] || fail "the copy looks incomplete: $tables tables"
aws s3 cp "$file" "s3://$FRANOS_BACKUP_BUCKET/$name" --only-show-errors || fail "could not store the copy"
echo "Backup stored: $name ($tables tables, $(du -h "$file" | cut -f1))"
