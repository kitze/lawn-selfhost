import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      issuer: process.env.LAWN_AUTH_ISSUER!,
      jwks: process.env.LAWN_AUTH_JWKS_URL!,
      algorithm: "RS256",
      applicationID: "lawn-selfhost",
    },
  ],
} satisfies AuthConfig;
