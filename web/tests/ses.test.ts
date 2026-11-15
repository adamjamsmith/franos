import type { SendEmailCommandInput } from "@aws-sdk/client-sesv2";
import { describe, expect, it } from "vitest";
import { fromLine, sesCredentialsFromEnv, sesDeliver, sesMessage } from "../src/email/ses";

const mail = {
  to: " dana@example.test ",
  fromName: "The Refresh Renovation team",
  fromAddress: "hello@refresh.example.test",
  subject: "Your prospectus",
  text: "Hello Dana",
  html: "<p>Hello Dana</p>",
  headers: { "List-Unsubscribe": "<https://x.test/api/unsubscribe/1?s=abc>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
};

describe("the key for sending real email", () => {
  it("is read from memory, and is nothing without both halves", () => {
    expect(sesCredentialsFromEnv({})).toBeNull();
    expect(sesCredentialsFromEnv({ FRANOS_SES_CREDENTIALS: "not json" })).toBeNull();
    expect(sesCredentialsFromEnv({ FRANOS_SES_CREDENTIALS: JSON.stringify({ accessKeyId: "A" }) })).toBeNull();
    expect(sesCredentialsFromEnv({ FRANOS_SES_CREDENTIALS: JSON.stringify({ accessKeyId: "A", secretAccessKey: "S" }) })).toEqual({ accessKeyId: "A", secretAccessKey: "S", region: "eu-north-1" });
    expect(sesCredentialsFromEnv({ FRANOS_SES_CREDENTIALS: JSON.stringify({ accessKeyId: "A", secretAccessKey: "S", region: "eu-west-2", configurationSet: "franos" }) })).toMatchObject({ region: "eu-west-2", configurationSet: "franos" });
  });
});

describe("an email on its way to Amazon", () => {
  it("carries the sender, the person, the subject, both versions and the unsubscribe headers", () => {
    const message = sesMessage(mail, "franos");
    expect(message.FromEmailAddress).toBe('"The Refresh Renovation team" <hello@refresh.example.test>');
    expect(message.Destination).toEqual({ ToAddresses: ["dana@example.test"] });
    expect(message.Content?.Simple?.Subject?.Data).toBe("Your prospectus");
    expect(message.Content?.Simple?.Body?.Text?.Data).toBe("Hello Dana");
    expect(message.Content?.Simple?.Body?.Html?.Data).toBe("<p>Hello Dana</p>");
    expect(message.Content?.Simple?.Headers).toEqual([
      { Name: "List-Unsubscribe", Value: "<https://x.test/api/unsubscribe/1?s=abc>" },
      { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
    ]);
    expect(message.ConfigurationSetName).toBe("franos");
  });

  it("is plain text only when there is no designed version, with no empty extras", () => {
    const message = sesMessage({ to: "a@example.test", fromName: "franOS", fromAddress: "login@x.test", subject: "Your code", text: "123456" });
    expect(message.Content?.Simple?.Body).toEqual({ Text: { Data: "123456", Charset: "UTF-8" } });
    expect(message.Content?.Simple).not.toHaveProperty("Headers");
    expect(message).not.toHaveProperty("ConfigurationSetName");
  });

  it("cannot be given extra headers through a subject, a name or a header value", () => {
    const message = sesMessage({ ...mail, subject: "Hi\r\nBcc: someone@evil.test", fromName: 'Evil"\r\nBcc: x@evil.test', headers: { "X-Ok": "fine", "X-Bad": "a\r\nBcc: x@evil.test", "Bad Name": "x" } });
    expect(message.Content?.Simple?.Subject?.Data).toBe("Hi Bcc: someone@evil.test");
    expect(message.FromEmailAddress).not.toMatch(/[\r\n]/);
    expect(message.Content?.Simple?.Headers).toEqual([{ Name: "X-Ok", Value: "fine" }]);
  });

  it("encodes a sender name with accents, and leaves a bare address alone", () => {
    expect(fromLine("Café Réno", "a@x.test")).toBe(`=?UTF-8?B?${Buffer.from("Café Réno").toString("base64")}?= <a@x.test>`);
    expect(fromLine("", "a@x.test")).toBe("a@x.test");
  });

  it("hands the email to Amazon, and passes on a refusal so the send is tried again", async () => {
    const sent: SendEmailCommandInput[] = [];
    const deliver = sesDeliver({ accessKeyId: "A", secretAccessKey: "S", region: "eu-north-1" }, async (input) => void sent.push(input));
    await deliver(mail);
    expect(sent).toHaveLength(1);
    expect(sent[0].Destination?.ToAddresses).toEqual(["dana@example.test"]);

    const refusing = sesDeliver({ accessKeyId: "A", secretAccessKey: "S", region: "eu-north-1" }, async () => {
      throw new Error("Email address is not verified");
    });
    await expect(refusing(mail)).rejects.toThrow("not verified");
  });
});
