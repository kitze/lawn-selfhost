import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function subjectForEmail(email: string) {
  const normalized = normalizedEmail(email);
  if (normalized === normalizedEmail(process.env.LAWN_BOOTSTRAP_EMAIL ?? "")) {
    return "selfhost-user";
  }
  return `email:${normalized}`;
}

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail(args.email)))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizedEmail(args.email);
    const existing = await ctx.db
      .query("authUsers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("Account already exists");
    }

    const now = Date.now();
    const subject = subjectForEmail(email);

    await ctx.db.insert("authUsers", {
      subject,
      email,
      name: args.name.trim() || email,
      passwordSalt: args.passwordSalt,
      passwordHash: args.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    return { subject, email, name: args.name.trim() || email };
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = typeof identity.email === "string" ? normalizedEmail(identity.email) : "";
    const name =
      typeof identity.name === "string" && identity.name.trim()
        ? identity.name.trim()
        : email;

    return {
      subject: identity.subject,
      email,
      name,
      pictureUrl:
        typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined,
    };
  },
});
