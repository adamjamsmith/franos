// Runs on the server. Emails the owner through Amazon SES using the server's send-only key.
//   node franos-alert.cjs "Subject" "Text"
// The owner's address is kept on the server in /etc/franos/alert-to, readable by the administrator account only.
const { readFileSync } = require("node:fs");
const { SESv2Client, SendEmailCommand } = require("/srv/franos/app/node_modules/@aws-sdk/client-sesv2");

const [subject, text] = process.argv.slice(2);
const to = readFileSync("/etc/franos/alert-to", "utf8").trim();
const key = JSON.parse(process.env.FRANOS_SES_CREDENTIALS);
const client = new SESv2Client({ region: key.region, credentials: { accessKeyId: key.accessKeyId, secretAccessKey: key.secretAccessKey } });
client
  .send(
    new SendEmailCommand({
      FromEmailAddress: '"franOS" <login@refresh.franchiseright.co.uk>',
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
    }),
  )
  .then(() => console.log("Alert sent."))
  .catch((error) => {
    console.error("Alert could not be sent:", error.name);
    process.exit(1);
  });
