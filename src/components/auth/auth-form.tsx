"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OAuthProvider = "google" | "apple";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);
  const [sent, setSent] = useState(false);

  const isSignup = mode === "signup";

  // Surface auth errors bounced back from the callback route.
  useEffect(() => {
    if (params.get("error")) {
      toast.error("That sign-in link didn't work. Please try again.");
      router.replace(isSignup ? "/signup" : "/login");
    }
  }, [params, router, isSignup]);

  function redirectTo() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't send the link. Try again."
      );
    } finally {
      setSending(false);
    }
  }

  async function signInWith(provider: OAuthProvider) {
    setRedirecting(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo() },
      });
      if (error) throw error;
      // On success the browser is redirected to the provider.
    } catch (err) {
      setRedirecting(null);
      toast.error(
        err instanceof Error
          ? err.message
          : `Couldn't continue with ${provider}.`
      );
    }
  }

  if (sent) {
    return (
      <div className="rounded-[1.5rem] border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in
          — no password needed.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {isSignup
          ? "Start turning lectures into notes in minutes."
          : "Sign in to your Atlas library."}
      </p>

      <div className="mt-6 grid gap-3">
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => signInWith("google")}
          disabled={!!redirecting}
        >
          {redirecting === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => signInWith("apple")}
          disabled={!!redirecting}
        >
          {redirecting === "apple" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <AppleIcon />
          )}
          Continue with Apple
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={sending || !!redirecting}
          className="h-11 w-full"
        >
          {sending && <Loader2 className="size-4 animate-spin" />}
          Send magic link
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground text-pretty">
        We&apos;ll email you a secure link to sign in — no password to remember.
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account? " : "New to Atlas? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-primary hover:underline"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.42 1.98-3.58 2.07-3.64-1.13-1.65-2.89-1.88-3.51-1.9-1.49-.15-2.91.88-3.67.88-.76 0-1.93-.86-3.17-.84-1.63.02-3.13.95-3.97 2.41-1.69 2.94-.43 7.29 1.21 9.67.8 1.17 1.76 2.48 3.01 2.43 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.15.76 1.3-.02 2.12-1.19 2.92-2.36.92-1.35 1.3-2.66 1.32-2.73-.03-.01-2.53-.97-2.56-3.85ZM14.63 4.84c.67-.81 1.12-1.94.99-3.06-.96.04-2.12.64-2.81 1.45-.62.72-1.16 1.87-1.02 2.97 1.07.08 2.17-.55 2.84-1.36Z" />
    </svg>
  );
}
