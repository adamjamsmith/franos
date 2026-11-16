// Writes the settings the server needs, read from AWS Parameter Store with your own AWS login.
// Used only by server-deploy.sh, which pipes the output straight to the server over SSH.
// The output holds passwords: it refuses to print to a screen.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.stdout.isTTY) {
  console.error("This prints passwords. It only runs piped to the server by server-deploy.sh.");
  process.exit(1);
}

const installed = "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe";
const aws = process.platform === "win32" && existsSync(installed) ? installed : "aws";
const region = process.env.AWS_REGION ?? "eu-north-1";
const read = (name) =>
  execFileSync(aws, ["ssm", "get-parameter", "--region", region, "--name", name, "--with-decryption", "--query", "Parameter.Value", "--output", "text"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const address = process.argv[2];
if (!address || !/^https?:\/\/[a-z0-9.:-]+$/i.test(address)) {
  console.error("Give the address franOS is reached at, such as https://crm.franchiseright.co.uk");
  process.exit(1);
}

let values;
try {
  const zoom = read("/franos/zoom");
  JSON.parse(zoom);
  let metaToken = "";
  try {
    metaToken = String(JSON.parse(read("/franos/meta")).accessToken ?? "");
  } catch {
    metaToken = "";
  }
  // The send-only email key. Without it the server refuses to send, and says so in its log.
  let ses = "";
  try {
    ses = read("/franos/ses");
    JSON.parse(ses);
  } catch {
    ses = "";
  }
  // The name of the channel Amazon reports bounces and complaints on. Not a secret. Without it the reports address stays off.
  let topic = "";
  try {
    topic = read("/franos/ses-topic");
  } catch {
    topic = "";
  }
  // Where the nightly database backups go. Not a secret.
  let bucket = "";
  try {
    bucket = read("/franos/backup-bucket");
  } catch {
    bucket = "";
  }
  values = {
    ...(bucket ? { FRANOS_BACKUP_BUCKET: bucket } : {}),
    ...(ses ? { FRANOS_SES_CREDENTIALS: ses } : {}),
    ...(topic.startsWith("arn:aws:sns:") ? { FRANOS_SES_TOPIC_ARN: topic } : {}),
    NODE_ENV: "production",
    BETTER_AUTH_URL: address,
    FRANOS_MEDIA_DIR: "/srv/franos/media",
    FRANOS_DATABASE_URL: read("/franos/db"),
    FRANOS_ZOOM_CREDENTIALS: zoom,
    ...(metaToken && !metaToken.includes("PASTE_") ? { FRANOS_META_TOKEN: metaToken } : {}),
  };
} catch {
  console.error(`Could not read the settings from AWS. If your AWS login has expired, run: aws login --region ${region}`);
  process.exit(1);
}

for (const [key, value] of Object.entries(values)) {
  if (/['\n\r]/.test(value)) {
    console.error(`The value of ${key} holds a character the server's settings file cannot carry.`);
    process.exit(1);
  }
}
process.stdout.write(Object.entries(values).map(([key, value]) => `${key}='${value}'\n`).join(""));
