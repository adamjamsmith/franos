import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { adminDb } from "../db";
import { accounts, sessions, twoFactors, users, verifications } from "../db/schema";
import { deliverSystemMail } from "../email/deliver";

async function build() {
  const db = await adminDb();
  return betterAuth({
    appName: "franOS",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications, twoFactor: twoFactors },
    }),
    user: {
      additionalFields: { isOwner: { type: "boolean", required: false, defaultValue: false, input: false } },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      additionalFields: { twoStepVerifiedAt: { type: "date", required: false, input: false } },
    },
    plugins: [
      // Sign in with a 6-digit code sent by email. Only people who have been added can sign in.
      emailOTP({
        disableSignUp: true,
        expiresIn: 600,
        async sendVerificationOTP({ email, otp }) {
          await deliverSystemMail({ to: email, subject: "Your franOS login code", body: `Your franOS login code is ${otp}

It works for 10 minutes. If you did not ask for it, ignore this email.` });
        },
      }),
      // The authenticator-app code. franOS enforces it per session (see lib/session.ts).
      twoFactor({ issuer: "franOS", allowPasswordless: true }),
      nextCookies(),
    ],
  });
}

type Auth = Awaited<ReturnType<typeof build>>;
const holder = globalThis as unknown as { __franosAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  return (holder.__franosAuth ??= build());
}
