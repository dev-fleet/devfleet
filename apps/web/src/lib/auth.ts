import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { env } from "@/env.mjs";
import { syncUserOrgsAndMemberships } from "@/actions/github";
// import { sendInternalSlackNotification } from "./server/utils";
import { after } from "next/server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  trustedOrigins: [env.NEXT_PUBLIC_URL],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  socialProviders: {
    github: {
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      scope: ["read:user", "user:email", "read:org"],
    },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          // Store GitHub organizations after account creation/update
          try {
            if (account.providerId === "github" && account.accessToken) {
              // Since user signed up with Github, we can fetch their organizations and store them in the database
              await syncUserOrgsAndMemberships(
                account.userId,
                account.accessToken
              );
            }
          } catch (error) {
            console.error("Failed to store organizations:", error);
            // Don't block the user creation process if organization storage fails
          }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          // Notify slack
          // after(async () => {
          //   await sendInternalSlackNotification(
          //     `${user.email} has created an account`
          //   );
          // });
        },
      },
    },
  },
});
