"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { ReactNode } from "react";
import {
  SelfHostedAuthProvider,
  useSelfHostedAuthForConvex,
} from "@/lib/selfHostedAuth";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <SelfHostedAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useSelfHostedAuthForConvex}>
        {children}
      </ConvexProviderWithAuth>
    </SelfHostedAuthProvider>
  );
}

export { convex };
