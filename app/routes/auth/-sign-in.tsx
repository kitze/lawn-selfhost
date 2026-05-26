import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelfHostedAuth } from "@/lib/selfHostedAuth";

function redirectFromSearch(searchStr: string) {
  const redirectUrl = new URLSearchParams(searchStr).get("redirect_url");
  return redirectUrl || "/dashboard";
}

export default function SignInPage() {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const { signIn } = useSelfHostedAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      window.location.assign(redirectFromSearch(searchStr));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="border-2 border-[#dc2626] bg-[#dc2626]/10 p-3 text-sm text-[#dc2626]">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-[#888]">
        Need an account?{" "}
        <a
          href={`/sign-up?redirect_url=${encodeURIComponent(redirectFromSearch(searchStr))}`}
          className="font-bold text-[#1a1a1a] underline"
        >
          Sign up
        </a>
      </p>
    </form>
  );
}
