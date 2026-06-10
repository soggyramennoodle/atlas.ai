"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Fingerprint,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { browserSupportsPasskeys } from "@/lib/passkeys";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { lookupAuthEmail } from "@/app/login/actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { usePasskeySignIn } from "@/components/auth/use-passkey-sign-in";

type OAuthProvider = "google";

type AuthStep =
  | "main"
  | "magic-sent"
  | "no-account"
  | "already-exists"
  | "sign-in-choice";

const RESEND_COOLDOWN = 90;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const isSignup = mode === "signup";
  const passkeysSupported = browserSupportsPasskeys();

  const [email, setEmail] = useState(() => params.get("email")?.trim() ?? "");
  const [step, setStep] = useState<AuthStep>("main");
  const [sending, setSending] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { signIn: signInWithPasskey, signingIn: passkeySigningIn } =
    usePasskeySignIn(next);

  useEffect(() => {
    if (params.get("error")) {
      toast.error("That sign-in link didn't work. Please try again.");
      router.replace(isSignup ? "/signup" : "/login");
    }
  }, [params, router, isSignup]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function redirectTo() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function deliverMagicLink(createUser: boolean): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo(),
        shouldCreateUser: createUser,
      },
    });
    if (error) {
      toast.error(authErrorMessage(error));
      return false;
    }
    return true;
  }

  async function sendMagicLink(createUser: boolean) {
    setSending(true);
    try {
      if (await deliverMagicLink(createUser)) {
        setStep("magic-sent");
        setCooldown(RESEND_COOLDOWN);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setContinuing(true);
    try {
      const lookup = await lookupAuthEmail(email);

      if (isSignup) {
        if (lookup.exists) {
          setStep("already-exists");
          return;
        }
        await sendMagicLink(true);
        return;
      }

      if (!lookup.exists) {
        setStep("no-account");
        return;
      }

      if (lookup.hasPasskey && passkeysSupported) {
        setStep("sign-in-choice");
        return;
      }

      await sendMagicLink(false);
    } finally {
      setContinuing(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || sending) return;
    await sendMagicLink(isSignup);
  }

  function goBack() {
    setStep("main");
    setCooldown(0);
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
    } catch (err) {
      setRedirecting(null);
      toast.error(
        err instanceof Error
          ? err.message
          : `Couldn't continue with ${provider}.`
      );
    }
  }

  const authBusy = sending || continuing || !!redirecting || passkeySigningIn;

  if (step === "magic-sent") {
    return (
      <div className="rounded-[4px] border border-border bg-card p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <span className="mx-auto grid size-12 place-items-center rounded-[4px] border border-border bg-background text-foreground">
          <Mail className="size-6" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in,
          no password needed.
        </p>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          Nothing in your inbox? Check your junk or spam folder.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            className="w-full"
            onClick={() => void resend()}
            disabled={cooldown > 0 || sending}
          >
            {sending && <Loader2 className="size-4 animate-spin" />}
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
          </Button>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (step === "no-account") {
    return (
      <div className="rounded-[4px] border border-border bg-card p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <h2 className="text-2xl font-bold tracking-tight">No account found</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          We couldn&apos;t find an Atlas account for <strong>{email}</strong>.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link href="/signup" className={cn(buttonVariants(), "w-full")}>
            Create an account
          </Link>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  if (step === "already-exists") {
    return (
      <div className="rounded-[4px] border border-border bg-card p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <h2 className="text-2xl font-bold tracking-tight">
          You already have an account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          <strong>{email}</strong> is already registered with Atlas.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href={`/login?email=${encodeURIComponent(email)}`}
            className={cn(buttonVariants(), "w-full")}
          >
            Sign in instead
          </Link>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  if (step === "sign-in-choice") {
    return (
      <div className="rounded-[4px] border border-border bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
        <h2 className="text-2xl font-bold tracking-tight">Choose how to sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          For <strong>{email}</strong>
        </p>

        <div className="mt-6 grid gap-3">
          <Button
            className="h-11 w-full gap-2"
            onClick={() => void signInWithPasskey()}
            disabled={authBusy}
          >
            {passkeySigningIn ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Use passkey
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => void sendMagicLink(false)}
            disabled={authBusy}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Send magic link
          </Button>
        </div>

        <button
          type="button"
          onClick={goBack}
          className="mt-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border border-border bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_50px_-24px_rgba(0,0,0,0.25)]">
      <h1 className="text-3xl font-bold tracking-[-0.02em]">
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
          disabled={authBusy}
        >
          {redirecting === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </Button>

        {!isSignup && passkeysSupported && (
          <Button
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => void signInWithPasskey()}
            disabled={authBusy}
          >
            {passkeySigningIn ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Sign in with passkey
          </Button>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={(e) => void handleEmailContinue(e)} className="space-y-4">
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
        <Button type="submit" disabled={authBusy} className="h-11 w-full">
          {(continuing || sending) && <Loader2 className="size-4 animate-spin" />}
          Continue
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground text-pretty">
        {isSignup
          ? "We'll email you a secure link to finish creating your account."
          : "Enter your email to sign in with a passkey or magic link."}
      </p>

      {!isSignup && (
        <p className="mt-3 text-center text-xs text-muted-foreground text-pretty">
          Institutional emails (e.g. @mcmaster.ca, @mail.utoronto.ca) may be
          blocked by your school&apos;s security filters. Use a personal email for
          the best experience.
        </p>
      )}

      <p className="mt-2 text-center text-xs">
        <Link
          href="/sign-in-help"
          className="group inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Learn more
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
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
