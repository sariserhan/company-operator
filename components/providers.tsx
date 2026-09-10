"use client";
import { useState, useCallback, type ReactNode } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { authClient } from "@/lib/auth-client";
// Use the typed Convex auth bridge directly: adapter 0.12.5's React wrapper
// intersects plugin options into the session type, producing `never` with BA 1.6.
function useBetterAuth() {
  const { data: session, isPending } = authClient.useSession();
  const sessionId = session?.session.id;
  const fetchAccessToken = useCallback(async () => {
    if (!sessionId) return null;
    const result = await authClient.convex.token({
      fetchOptions: { throw: false },
    });
    return result.data?.token ?? null;
  }, [sessionId]);
  return {
    isLoading: isPending,
    isAuthenticated: Boolean(session),
    fetchAccessToken,
  };
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    process.env.NEXT_PUBLIC_CONVEX_URL
      ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
      : null,
  );
  if (!client)
    return (
      <main className="notice stack">
        <h1>Company Operator</h1>
        <h2>Connect your workspace</h2>
        <p>
          Start the local Convex backend with <code>npx convex dev</code>, then
          restart Next.js. The backend will save its connection URLs in
          .env.local.
        </p>
        <p className="muted">
          Business metrics remain unknown until the integrations are configured
          and a run completes.
        </p>
      </main>
    );
  return (
    <ConvexProviderWithAuth client={client} useAuth={useBetterAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
