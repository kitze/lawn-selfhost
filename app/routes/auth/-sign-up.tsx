import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelfHostedAuth } from "@/lib/selfHostedAuth";

function redirectFromSearch(searchStr: string) {
  const redirectUrl = new URLSearchParams(searchStr).get("redirect_url");
  return redirectUrl || "/dashboard";
}

export default function SignUpPage() {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const { signUp } = useSelfHostedAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signUp({ name, email, password });
      window.location.assign(redirectFromSearch(searchStr));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          autoComplete="name"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          autoComplete="new-password"
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-[#888]">
        Already have an account?{" "}
        <a
          href={`/sign-in?redirect_url=${encodeURIComponent(redirectFromSearch(searchStr))}`}
          className="font-bold text-[#1a1a1a] underline"
        >
          Sign in
        </a>
      </p>
    </form>
  );
}
