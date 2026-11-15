// Starts franOS on this computer with the real Zoom connected.
//
// The Zoom app's three codes are kept in the AWS secret store, never in a file. This script asks AWS
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
const secretName = process.env.FRANOS_ZOOM_SECRET ?? "franos/zoom";
const region = process.env.AWS_REGION ?? "eu-north-1";

let credentials;
try {
  credentials = execFileSync(aws, ["secretsmanager", "get-secret-value", "--region", region, "--secret-id", secretName, "--query", "SecretString", "--output", "text"], {
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

console.log("Zoom codes loaded from AWS. Starting franOS with the real Zoom connected.");
const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, FRANOS_ZOOM_CREDENTIALS: credentials },
});
child.on("exit", (code) => process.exit(code ?? 0));
