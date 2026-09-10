import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { APIError } from "better-auth/api";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
export const authComponent = createClient<DataModel>(components.betterAuth);
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: process.env.SITE_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      disableSignUp: process.env.ALLOW_SIGNUP !== "true",
      minPasswordLength: 12,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (
              !process.env.OPERATOR_EMAIL ||
              user.email.toLowerCase() !==
                process.env.OPERATOR_EMAIL.toLowerCase()
            )
              throw new APIError("FORBIDDEN", {
                message: "This workspace is restricted to its operator.",
              });
            return { data: user };
          },
        },
      },
    },
    plugins: [convex({ authConfig })],
  });
