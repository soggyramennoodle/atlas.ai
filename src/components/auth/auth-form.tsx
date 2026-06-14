"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { browserSupportsPasskeys } from "@/lib/passkeys";
import { lookupAuthEmail } from "@/app/(auth)/login/actions";
import { authErrorMessage } from "@/lib/auth-errors";
import { usePasskeySignIn } from "@/components/auth/use-passkey-sign-in";
import {
  ARROW_BADGE,
  EASE,
  GHOST_LINK,
  INK_LINK,
  PILL_INPUT,
  PILL_PRIMARY,
  PILL_SECONDARY,
} from "@/components/app/pills";

type OAuthProvider = "google";

type AuthStep =
  | "main"
  | "magic-sent"
  | "no-account"
  | "already-exists"
  | "sign-in-choice"
  | "account-locked";

const SUPPORT_EMAIL = "hello@atlasai.ca";

const RESEND_COOLDOWN = 90;

/* Pill primitives + EASE now live in @/components/app/pills, shared with the
   app shell so the two surfaces can't drift. */

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const isSignup = mode === "signup";
  const reduceMotion = useReducedMotion();
  const [passkeysSupported, setPasskeysSupported] = useState(false);

  const [email, setEmail] = useState(() => params.get("email")?.trim() ?? "");
  const [step, setStep] = useState<AuthStep>("main");
  const [sending, setSending] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { signIn: signInWithPasskey, signingIn: passkeySigningIn } =
    usePasskeySignIn(next);

  // Detect passkey support after mount to avoid SSR/client hydration mismatch.
  useEffect(() => {
    Promise.resolve(browserSupportsPasskeys()).then(setPasskeysSupported);
  }, []);

  useEffect(() => {
    if (params.get("error")) {
      toast.error("That sign-in link didn't work. Please try again.");
      router.replace(isSignup ? "/signup" : "/login");
    }
    if (!isSignup && params.get("locked")) {
      setStep("account-locked");
      router.replace("/login");
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

      if (lookup.banned) {
        setStep("account-locked");
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

  function renderStep() {
    if (step === "magic-sent") {
      return (
        <div>
          <span className="grid size-12 place-items-center rounded-full border border-black/[0.12] bg-white text-[#0d0d0d]">
            <Mail className="size-5" />
          </span>
          <h2 className="mt-6 text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
            Check <span className="font-instrument italic">your email</span>
          </h2>
          <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
            We sent a magic link to <strong className="font-medium text-[#0d0d0d]">{email}</strong>.
            Click it to sign in, no password needed.
          </p>
          <p className="mt-1 text-xs text-[#0d0d0d]/45 text-pretty">
            Nothing in your inbox? Check your junk or spam folder.
          </p>
          <p className="mt-1 text-xs text-[#0d0d0d]/45 text-pretty">
            Used an institutional email? Universities often block or delay
            outside mail with their security filters, so the link may never
            arrive. Try again with a personal email instead.
          </p>

          <div className="mt-8 grid gap-4">
            <button
              type="button"
              className={PILL_PRIMARY}
              onClick={() => void resend()}
              disabled={cooldown > 0 || sending}
            >
              {sending && <Loader2 className="size-4 animate-spin" />}
              {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
            </button>
            <button type="button" onClick={goBack} className={GHOST_LINK}>
              <ArrowLeft className="size-3.5" />
              Go back
            </button>
          </div>
        </div>
      );
    }

    if (step === "no-account") {
      return (
        <div>
          <h2 className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
            No account <span className="font-instrument italic">found yet</span>
          </h2>
          <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
            We couldn&apos;t find an Atlas account for{" "}
            <strong className="font-medium text-[#0d0d0d]">{email}</strong>.
          </p>
          <div className="mt-8 grid gap-4">
            <Link href="/signup" className={PILL_PRIMARY}>
              Create an account
              {ARROW_BADGE}
            </Link>
            <button type="button" onClick={goBack} className={GHOST_LINK}>
              <ArrowLeft className="size-3.5" />
              Try a different email
            </button>
          </div>
        </div>
      );
    }

    if (step === "already-exists") {
      return (
        <div>
          <h2 className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
            You already{" "}
            <span className="font-instrument italic">have an account</span>
          </h2>
          <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
            <strong className="font-medium text-[#0d0d0d]">{email}</strong> is
            already registered with Atlas.
          </p>
          <div className="mt-8 grid gap-4">
            <Link
              href={`/login?email=${encodeURIComponent(email)}`}
              className={PILL_PRIMARY}
            >
              Sign in instead
              {ARROW_BADGE}
            </Link>
            <button type="button" onClick={goBack} className={GHOST_LINK}>
              <ArrowLeft className="size-3.5" />
              Try a different email
            </button>
          </div>
        </div>
      );
    }

    if (step === "account-locked") {
      return (
        <div>
          <span className="grid size-12 place-items-center rounded-full border border-black/[0.12] bg-white text-[#0d0d0d]">
            <Lock className="size-5" />
          </span>
          <h2 className="mt-6 text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
            Account <span className="font-instrument italic">locked</span>
          </h2>
          <p className="mt-3 text-sm text-[#0d0d0d]/55 text-pretty">
            This account has been locked and can&apos;t sign in. If you think this
            is a mistake, reach out and we&apos;ll help sort it out.
          </p>
          <div className="mt-8 grid gap-4">
            <a href={`mailto:${SUPPORT_EMAIL}`} className={PILL_PRIMARY}>
              <Mail className="size-4" />
              Contact {SUPPORT_EMAIL}
            </a>
            <button type="button" onClick={goBack} className={GHOST_LINK}>
              <ArrowLeft className="size-3.5" />
              Try a different email
            </button>
          </div>
        </div>
      );
    }

    if (step === "sign-in-choice") {
      return (
        <div>
          <h2 className="text-[2rem] font-normal leading-[1.05] tracking-[-0.02em]">
            Choose how <span className="font-instrument italic">to sign in</span>
          </h2>
          <p className="mt-3 text-sm text-[#0d0d0d]/55">
            For <strong className="font-medium text-[#0d0d0d]">{email}</strong>
          </p>

          <div className="mt-8 grid gap-3">
            <button
              type="button"
              className={PILL_PRIMARY}
              onClick={() => void signInWithPasskey()}
              disabled={authBusy}
            >
              {passkeySigningIn ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              Use passkey
            </button>
            <button
              type="button"
              className={PILL_SECONDARY}
              onClick={() => void sendMagicLink(false)}
              disabled={authBusy}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send magic link
            </button>
          </div>

          <button type="button" onClick={goBack} className={`${GHOST_LINK} mt-6`}>
            <ArrowLeft className="size-3.5" />
            Go back
          </button>
        </div>
      );
    }

    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-[2px] text-[#0d0d0d]/45">
          {isSignup ? "Get started" : "Welcome back"}
        </p>
        <h1 className="mt-3 text-[2.35rem] font-normal leading-[1.02] tracking-[-0.03em] text-balance">
          {isSignup ? (
            <>
              Start <span className="font-instrument italic">learning smarter</span>
            </>
          ) : (
            <>
              Pick up{" "}
              <span className="font-instrument italic">where you left off</span>
            </>
          )}
        </h1>
        <p className="mt-3 text-sm text-[#0d0d0d]/55">
          {isSignup
            ? "Start turning lectures into notes in minutes."
            : "Sign in to your Atlas library."}
        </p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            className={PILL_SECONDARY}
            onClick={() => signInWith("google")}
            disabled={authBusy}
          >
            {redirecting === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          {!isSignup && passkeysSupported && (
            <button
              type="button"
              className={PILL_SECONDARY}
              onClick={() => void signInWithPasskey()}
              disabled={authBusy}
            >
              {passkeySigningIn ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              Sign in with passkey
            </button>
          )}
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-[#0d0d0d]/45">
          <span className="h-px flex-1 bg-black/[0.08]" />
          or with email
          <span className="h-px flex-1 bg-black/[0.08]" />
        </div>

        <form onSubmit={(e) => void handleEmailContinue(e)} className="space-y-3">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@university.edu"
            className={PILL_INPUT}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={authBusy} className={PILL_PRIMARY}>
            {(continuing || sending) && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Continue
            {ARROW_BADGE}
          </button>
        </form>

        <p className="mt-5 text-xs text-[#0d0d0d]/45 text-pretty">
          {isSignup
            ? "We'll email you a secure link to finish creating your account."
            : "Enter your email to sign in with a passkey or magic link."}
        </p>

        {!isSignup && (
          <p className="mt-3 text-xs text-[#0d0d0d]/45 text-pretty">
            Institutional emails (e.g. @mcmaster.ca, @mail.utoronto.ca) may be
            blocked by your school&apos;s security filters. Use a personal email
            for the best experience.{" "}
            <Link
              href="/sign-in-help"
              className="group inline-flex items-center gap-1 font-medium text-[#0d0d0d] underline-offset-4 hover:underline"
            >
              Learn more
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </p>
        )}

        {isSignup && (
          <p className="mt-3 text-xs text-[#0d0d0d]/45 text-pretty">
            Trouble signing up?{" "}
            <Link
              href="/sign-in-help"
              className="group inline-flex items-center gap-1 font-medium text-[#0d0d0d] underline-offset-4 hover:underline"
            >
              Learn more
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </p>
        )}

        <p className="mt-6 text-sm text-[#0d0d0d]/55">
          {isSignup ? "Already have an account? " : "New to Atlas? "}
          <Link href={isSignup ? "/login" : "/signup"} className={INK_LINK}>
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={reduceMotion ? false : { opacity: 0, filter: "blur(8px)", y: 8 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={
          reduceMotion
            ? { opacity: 0, transition: { duration: 0 } }
            : { opacity: 0, filter: "blur(8px)", y: -6 }
        }
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE }}
      >
        {renderStep()}
      </motion.div>
    </AnimatePresence>
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
