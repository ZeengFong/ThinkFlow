"use client";

import { useAuth } from "@/lib/auth-context";
import { googleClientId } from "@/lib/google-identity";
import { GoogleButton } from "@/components/google-button";
import Link from "next/link";
import { ArrowRight, Loader2, Mail, MailCheck, Workflow } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const ERROR_TEXT: Record<string, string> = {
  auth: "Sign-in didn't complete. Please try again.",
  session: "Your session expired. Please sign in again.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const { user, loading, localMode, signInWithGoogle, signInWithGoogleIdToken, signInWithEmail } =
    useAuth();
  const router = useRouter();
  const urlError = useSearchParams().get("error");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [formError, setError] = useState("");
  const [googleBlocked, setGoogleBlocked] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const useGoogleButton = Boolean(googleClientId) && !googleBlocked;
  const error = formError || (urlError ? ERROR_TEXT[urlError] || urlError : "");

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [user, loading, router]);

  const google = async () => {
    setError("");
    const message = await signInWithGoogle();
    if (message) setError(message);
  };

  const googleToken = async (idToken: string, nonce: string) => {
    setError("");
    setFinishing(true);
    const message = await signInWithGoogleIdToken(idToken, nonce);
    setFinishing(false);
    if (message) setError(message);
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);
    const message = await signInWithEmail(address);
    setSending(false);
    if (message) {
      setError(
        message.toLowerCase().includes("rate limit")
          ? "Too many sign-in emails were sent recently. Wait a few minutes, or use Google."
          : message
      );
    } else {
      setSentTo(address);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-soft-lg"
      >
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-baby-blue/15">
            <Workflow className="h-8 w-8 text-baby-blue" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">ThinkFlow</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Turn big assignments into clear, doable steps
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-muted-coral/10 px-3 py-2 text-xs text-muted-coral">
            {error}
          </p>
        )}

        {localMode ? (
          <>
            <button
              onClick={google}
              disabled={loading}
              className="press flex w-full items-center justify-center gap-2 rounded-xl bg-baby-blue px-4 py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-baby-blue-dark disabled:opacity-50"
            >
              Continue as local user <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              Local mode: sign-in turns on once Supabase keys are set in{" "}
              <code className="rounded bg-muted px-1">frontend/.env.local</code>.
            </p>
          </>
        ) : sentTo ? (
          <div className="flex flex-col items-center py-2 text-center">
            <MailCheck className="mb-3 h-10 w-10 text-soft-green" />
            <p className="text-sm font-medium text-foreground">Check your inbox</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              We sent a sign-in link to <span className="text-foreground">{sentTo}</span>. Open it on
              this device to continue. It can take a minute; check spam too.
            </p>
            <button
              onClick={() => setSentTo("")}
              className="mt-4 text-xs text-baby-blue hover:text-baby-blue-dark"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {finishing ? (
              <div className="flex min-h-[44px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
              </div>
            ) : useGoogleButton ? (
              <GoogleButton
                clientId={googleClientId}
                onCredential={googleToken}
                onUnavailable={() => setGoogleBlocked(true)}
              />
            ) : (
              <button
                onClick={google}
                disabled={loading}
                className="press flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-muted disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </button>
            )}

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or use your email</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={sendLink} className="space-y-2.5">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-baby-blue"
              />
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="press flex w-full items-center justify-center gap-2 rounded-xl bg-baby-blue px-4 py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-baby-blue-dark disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email me a sign-in link
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
}
