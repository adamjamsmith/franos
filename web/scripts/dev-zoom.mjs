// Starts franOS on this computer with the real Zoom connected, and Meta in test mode.
//
// The Zoom app's three codes are kept encrypted in AWS (Parameter Store), never in a file. This script asks AWS
// for them using your own AWS login (run `aws login` first if it has expired), hands them to franOS
// in memory only, and starts it. Nothing is written to disk and nothing is printed.
//
//   npm run dev:zoom
//
// Plain `npm run dev` still works, and uses the stand-in for Zoom.
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";

const installed = "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe";
const aws = process.platform === "win32" && existsSync(installed) ? installed : "aws";
// The codes are an encrypted entry in AWS Parameter Store (free), not Secrets Manager (paid per entry).
const secretName = process.env.FRANOS_ZOOM_SECRET ?? "/franos/zoom";
const region = process.env.AWS_REGION ?? "eu-north-1";

let credentials;
try {
  credentials = execFileSync(aws, ["ssm", "get-parameter", "--region", region, "--name", secretName, "--with-decryption", "--query", "Parameter.Value", "--output", "text"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  JSON.parse(credentials);
} catch (error) {
  const reason = String(error.stderr ?? error.message ?? error).split("\n")[0];
  console.error(`Could not read the Zoom codes from AWS (${secretName}). If your AWS login has expired, run: aws login --region ${region}`);
  console.error(reason.replace(/[A-Za-z0-9_\-]{20,}/g, "…"));
  process.exit(1);
}

// The Meta token is optional: without it, events are recorded and nothing is sent.
let metaToken = "";
try {
  const raw = execFileSync(aws, ["ssm", "get-parameter", "--region", region, "--name", process.env.FRANOS_META_SECRET ?? "/franos/meta", "--with-decryption", "--query", "Parameter.Value", "--output", "text"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const token = String(JSON.parse(raw).accessToken ?? "");
  if (token && !token.includes("PASTE_")) metaToken = token;
} catch {
  metaToken = "";
}

// Only when asked (FRANOS_HOSTED_DB=1): use the hosted database on Neon in place of this computer's own.
let databaseAddress = "";
if (process.env.FRANOS_HOSTED_DB === "1") {
  try {
    databaseAddress = execFileSync(aws, ["ssm", "get-parameter", "--region", region, "--name", "/franos/db", "--with-decryption", "--query", "Parameter.Value", "--output", "text"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    console.error("Could not read the database address from AWS (/franos/db).");
    process.exit(1);
  }
}

console.log(`Zoom codes loaded from AWS${metaToken ? ", and the Meta token" : ""}. Starting franOS connected${databaseAddress ? ", on the hosted database" : ""}.`);
const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, FRANOS_ZOOM_CREDENTIALS: credentials, ...(metaToken ? { FRANOS_META_TOKEN: metaToken } : {}), ...(databaseAddress ? { FRANOS_DATABASE_URL: databaseAddress } : {}) },
});
child.on("exit", (code) => process.exit(code ?? 0));
