import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { SignJWT, importJWK, type JWK } from "jose";

const http = httpRouter();

const AUTH_AUDIENCE = "lawn-selfhost";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.LAWN_APP_ORIGIN ?? "https://frame.server.kitze.io",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function empty(status = 204) {
  return new Response(null, { status, headers: corsHeaders });
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeEmail(email: unknown) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function normalizeName(name: unknown, email: string) {
  if (typeof name !== "string") return email;
  return name.trim() || email;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes = 24) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return base64Url(values);
}

async function passwordHash(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 210000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return base64Url(new Uint8Array(bits));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function signToken(user: { subject: string; email: string; name: string }) {
  const issuer = requireEnv("LAWN_AUTH_ISSUER");
  const privateJwk = JSON.parse(requireEnv("LAWN_AUTH_PRIVATE_JWK")) as JWK & {
    kid?: string;
  };
  const key = await importJWK(privateJwk, "RS256");
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
      kid: privateJwk.kid ?? "lawn-selfhost-1",
    })
    .setSubject(user.subject)
    .setIssuer(issuer)
    .setAudience(AUTH_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(key);
}

async function requestJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function authResponse(user: { subject: string; email: string; name: string }) {
  return json({
    token: await signToken(user),
    user,
  });
}

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/auth/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    return json({ keys: [JSON.parse(requireEnv("LAWN_AUTH_PUBLIC_JWK"))] });
  }),
});

http.route({
  path: "/auth/login",
  method: "OPTIONS",
  handler: httpAction(async () => empty()),
});

http.route({
  path: "/auth/register",
  method: "OPTIONS",
  handler: httpAction(async () => empty()),
});

http.route({
  path: "/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await requestJson(request);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return json({ error: "Email and password are required." }, 400);

    const user = await ctx.runQuery(internal.passwordAuth.getUserByEmail, { email });

    if (!user && email === normalizeEmail(process.env.LAWN_BOOTSTRAP_EMAIL)) {
      const bootstrapPassword = process.env.LAWN_BOOTSTRAP_PASSWORD;
      if (bootstrapPassword && timingSafeEqual(password, bootstrapPassword)) {
        const salt = randomToken();
        const created = await ctx.runMutation(internal.passwordAuth.createUser, {
          email,
          name: process.env.LAWN_BOOTSTRAP_NAME ?? "Kitze",
          passwordSalt: salt,
          passwordHash: await passwordHash(password, salt),
        });
        return await authResponse(created);
      }
    }

    if (!user) return json({ error: "Invalid email or password." }, 401);

    const attemptedHash = await passwordHash(password, user.passwordSalt);
    if (!timingSafeEqual(attemptedHash, user.passwordHash)) {
      return json({ error: "Invalid email or password." }, 401);
    }

    return await authResponse({
      subject: user.subject,
      email: user.email,
      name: user.name,
    });
  }),
});

http.route({
  path: "/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await requestJson(request);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const name = normalizeName(body.name, email);

    if (!email || !password) return json({ error: "Email and password are required." }, 400);
    if (password.length < 10) return json({ error: "Use at least 10 characters." }, 400);

    const salt = randomToken();
    try {
      const user = await ctx.runMutation(internal.passwordAuth.createUser, {
        email,
        name,
        passwordSalt: salt,
        passwordHash: await passwordHash(password, salt),
      });
      return await authResponse(user);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error && error.message
              ? error.message
              : "Could not create account.",
        },
        400,
      );
    }
  }),
});

export default http;
