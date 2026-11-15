import { SESv2Client, SendEmailCommand, type SendEmailCommandInput } from "@aws-sdk/client-sesv2";

/**
 * Real email, through Amazon SES.
 *
 * The server is given a key that can do one thing only: send email. It arrives in memory as
 * FRANOS_SES_CREDENTIALS and is never kept in the project. Without it, franOS on this computer
 * uses the test mailbox and nothing leaves the machine.
 */
export type SesCredentials = { accessKeyId: string; secretAccessKey: string; region: string; configurationSet?: string };

export type Mail = {
  to: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
};

export function sesCredentialsFromEnv(env: Record<string, string | undefined> = process.env): SesCredentials | null {
  const raw = env.FRANOS_SES_CREDENTIALS;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SesCredentials>;
    if (!value.accessKeyId || !value.secretAccessKey) return null;
    return {
      accessKeyId: String(value.accessKeyId),
      secretAccessKey: String(value.secretAccessKey),
      region: String(value.region || "eu-north-1"),
      ...(value.configurationSet ? { configurationSet: String(value.configurationSet) } : {}),
    };
  } catch {
    return null;
  }
}

/** A sender's name as an email header allows it: plain names in quotes, anything else encoded. */
export function fromLine(name: string, address: string): string {
  const clean = name.replace(/[\r\n]+/g, " ").trim();
  if (!clean) return address;
  const plain = /^[\x20-\x7e]*$/.test(clean);
  const shown = plain ? `"${clean.replace(/["\\]/g, "")}"` : `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
  return `${shown} <${address}>`;
}

/** One email, in the shape Amazon expects. */
export function sesMessage(mail: Mail, configurationSet?: string): SendEmailCommandInput {
  const utf8 = (Data: string) => ({ Data, Charset: "UTF-8" });
  const headers = Object.entries(mail.headers ?? {})
    .filter(([name, value]) => /^[\x21-\x39\x3b-\x7e]+$/.test(name) && value && !/[\r\n]/.test(value))
    .map(([Name, Value]) => ({ Name, Value }));
  return {
    FromEmailAddress: fromLine(mail.fromName, mail.fromAddress),
    Destination: { ToAddresses: [mail.to.trim()] },
    Content: {
      Simple: {
        Subject: utf8(mail.subject.replace(/[\r\n]+/g, " ")),
        Body: { Text: utf8(mail.text), ...(mail.html ? { Html: utf8(mail.html) } : {}) },
        ...(headers.length ? { Headers: headers } : {}),
      },
    },
    ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
  };
}

type Send = (input: SendEmailCommandInput) => Promise<unknown>;

/** Returns the function that sends one email. `send` exists so the tests can stand in for Amazon. */
export function sesDeliver(credentials: SesCredentials, send?: Send): (mail: Mail) => Promise<void> {
  let real: Send | undefined = send;
  return async (mail) => {
    if (!real) {
      const client = new SESv2Client({
        region: credentials.region,
        credentials: { accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey },
      });
      real = (input) => client.send(new SendEmailCommand(input));
    }
    await real(sesMessage(mail, credentials.configurationSet));
  };
}
