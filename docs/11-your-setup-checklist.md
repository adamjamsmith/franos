# Your setup checklist

Things only Adam can do, because they need accounts, passwords or a card. In order of urgency. **Never paste a password, key or token into the chat.** Each step says where it goes instead.

## Do first (they have waiting time)
- [ ] **1. Choose the franchise domain for Refresh Renovation.** For example `refreshrenovationsfranchise.co.uk`. Check John is happy for the brand name to be used. Tell Claude the name; don't buy it yet (it's easiest bought inside AWS in step 3).
- [ ] **2. Create an AWS account** at aws.amazon.com, in the business's name, with a card. Turn on two-step login for it straight away. Choose the Paid plan if asked (the Free plan blocks some services we need); the starting credits still apply.
- [ ] **3. In AWS: register the domain** (Route 53 → Register domain). About £10 a year.
- [ ] **4. In AWS: ask for email sending to be switched on** (SES → request production access). Claude will give you the wording. Approval usually takes a day or two. This starts the clock on warming up the email domain before 16 December.

## Needed for the build
- [ ] **5. Create a GitHub account** at github.com if you don't have one. Tell Claude the username.
- [ ] **6. Create a Neon account** at neon.tech (sign in with GitHub is fine). Create a project in the **London** region.
- [ ] **7. Install two small tools on this computer** when Claude asks: the AWS command-line tool and the GitHub command-line tool. You log in to each in your own terminal, so Claude never sees the passwords.

## Needed before Step 3 (calls) and Step 4
- [ ] **8. Zoom:** confirm Mike has Zoom Pro (needed for cloud recording and transcripts), and who can log in as the account admin to connect it.
- [ ] **9. Mike's calendar:** Google or Outlook?
- [ ] **10. Meta:** Refresh's dataset and an access token (Events Manager → the dataset → Settings → Conversions API). You paste the token into AWS's secret store yourself.

## People
- [ ] **11. Someone to check the legal wording** (consent text, privacy notice, client agreement). Claude drafts it.
- [ ] **12. Ask John for** real franchisee figures, the current support package, and his best franchisees to interview.
- [ ] **13. Agree with Mike** that he records budget, authority, need and timing after every call.
