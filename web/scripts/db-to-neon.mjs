// Sets up the hosted database on Neon and copies this computer's franOS data into it.
//
//   node scripts/db-to-neon.mjs check     look, change nothing
//   node scripts/db-to-neon.mjs migrate   create the tables (safe to run again)
//   node scripts/db-to-neon.mjs copy      copy the data from the local database (franOS must be stopped first)
//
// The database address holds a password. It is read from AWS Parameter Store using your own AWS login,
// kept in memory only, and never printed.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const mode = process.argv[2] ?? "check";
const installed = "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe";
const aws = process.platform === "win32" && existsSync(installed) ? installed : "aws";
const region = process.env.AWS_REGION ?? "eu-north-1";

let address;
try {
  address = execFileSync(aws, ["ssm", "get-parameter", "--region", region, "--name", "/franos/db", "--with-decryption", "--query", "Parameter.Value", "--output", "text"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
} catch {
  console.error(`Could not read the database address from AWS (/franos/db). If your AWS login has expired, run: aws login --region ${region}`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: address, max: 2 });
const hidden = (error) => String(error?.message ?? error).replaceAll(address, "…");
const one = async (sql, values) => (await pool.query(sql, values)).rows;
const tablesIn = async (query) =>
  (await query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1")).map((r) => r.table_name);

try {
  const [{ version, who }] = await one("select version(), current_user as who");
  const tables = await tablesIn(one);
  console.log(`Connected. ${version.split(",")[0]}. Tables: ${tables.length}.`);

  if (mode === "check") {
    for (const table of tables) {
      const [{ n }] = await one(`select count(*)::int as n from "${table}"`);
      console.log(`  ${table}: ${n}`);
    }
  }

  if (mode === "migrate") {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    // franOS switches into these two restricted roles for every piece of work. On Neon the login must be allowed to.
    await pool.query(`grant franos_app, franos_worker to "${who}"`).catch((error) => console.log(`  (grant: ${hidden(error)})`));
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role franos_app");
      const [{ seen }] = (await client.query("select count(*)::int as seen from clients")).rows;
      await client.query("rollback");
      console.log(`Tables ready: ${(await tablesIn(one)).length}. The restricted role works and sees ${seen} brands with no brand chosen.`);
    } finally {
      client.release();
    }
  }

  if (mode === "copy") {
    const local = new PGlite(process.env.FRANOS_PGLITE_DIR ?? ".data/pg");
    const from = async (sql) => (await local.query(sql)).rows;
    const tablesHere = await tablesIn(from);
    const there = await tablesIn(one);
    const missing = tablesHere.filter((t) => !there.includes(t));
    if (missing.length) throw new Error(`Run "migrate" first. Missing on Neon: ${missing.join(", ")}`);
    for (const table of there) {
      const [{ n }] = await one(`select count(*)::int as n from "${table}"`);
      if (n > 0) throw new Error(`Neon already has data in "${table}" (${n} rows). Nothing copied.`);
    }

    // Copy a table only after the tables it points to.
    const links = await from(`select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
      from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace`);
    const clean = (name) => name.replaceAll('"', "");
    const order = [];
    const left = new Set(tablesHere);
    while (left.size) {
      const ready = [...left].filter((t) => links.every((l) => clean(l.child) !== t || clean(l.parent) === t || !left.has(clean(l.parent))));
      if (!ready.length) throw new Error("Tables point at each other in a circle");
      for (const t of ready) {
        order.push(t);
        left.delete(t);
      }
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const table of order) {
        const columns = await from(`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = '${table}' order by ordinal_position`);
        const rows = await from(`select * from "${table}"`);
        const names = columns.map((c) => `"${c.column_name}"`).join(", ");
        for (const row of rows) {
          const values = columns.map((c) => {
            const value = row[c.column_name];
            return value !== null && (c.data_type === "jsonb" || c.data_type === "json") ? JSON.stringify(value) : value;
          });
          await client.query(`insert into "${table}" (${names}) values (${columns.map((_, i) => `$${i + 1}`).join(", ")})`, values);
        }
        // Keep automatic numbering going from where it left off.
        for (const c of columns) {
          const [{ seq }] = (await client.query("select pg_get_serial_sequence($1, $2) as seq", [table, c.column_name])).rows;
          if (seq) await client.query(`select setval($1, greatest((select coalesce(max("${c.column_name}"), 0) from "${table}"), 1))`, [seq]);
        }
        console.log(`  ${table}: ${rows.length}`);
      }
      await client.query("commit");
      console.log("Copied.");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
      await local.close();
    }
  }
} catch (error) {
  console.error(hidden(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
