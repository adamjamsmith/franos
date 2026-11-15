#!/usr/bin/env bash
# Runs on the server. Proves a backup can be brought back: loads the backup file given on standard input
# into a new, empty scratch database beside the real one, compares it with the real one, then removes the scratch.
# The real database is only read, never changed.
#   cat franos-2026-11-15.dump | sudo bash franos-restore-test.sh
set -uo pipefail
set -a
. /etc/franos/env
set +a
bin=/usr/lib/postgresql/18/bin
scratch="franos_restore_test"
file="$(mktemp /var/tmp/franos-restore.XXXXXX)"
trap 'rm -f "$file"' EXIT
cat > "$file"

# The scratch database's address: the real one with only the database name changed.
real="$FRANOS_DATABASE_URL"
test_url="$(node -e 'const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; process.stdout.write(u.toString())' "$real" "$scratch")"

$bin/psql "$real" -q -c "drop database if exists $scratch" -c "create database $scratch" >/dev/null || { echo "Could not create the scratch database"; exit 1; }
$bin/pg_restore --dbname="$test_url" --no-owner "$file" 2> /var/tmp/franos-restore.err
problems="$(grep -c 'error:' /var/tmp/franos-restore.err || true)"
echo "Restore finished with $problems problem(s)."
[ "$problems" -gt 0 ] && grep 'error:' /var/tmp/franos-restore.err | sed 's/postgres[^ ]*//g' | cut -c1-200 | head -5
rm -f /var/tmp/franos-restore.err

counts="$(cat <<'SQL'
select string_agg(t || '=' || n, ' ' order by t) from (
  select c.relname as t,
         (xpath('//n/text()', query_to_xml(format('select count(*) as n from %I', c.relname), false, true, '')))[1]::text::int as n
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relkind = 'r') x
SQL
)"
echo "Restored copy:  $($bin/psql "$test_url" -At -c "$counts")"
echo "Real database:  $($bin/psql "$real" -At -c "$counts")"
echo "Locks in the restored copy (row-level policies): $($bin/psql "$test_url" -At -c 'select count(*) from pg_policies')  real: $($bin/psql "$real" -At -c 'select count(*) from pg_policies')"
$bin/psql "$real" -q -c "drop database $scratch" >/dev/null && echo "Scratch database removed."
