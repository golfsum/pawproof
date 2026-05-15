"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/firebase";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultMode = params.get("mode") === "signup" ? "signup" : "signin";
  const nextParam = params.get("next");
  // Only honor relative paths so a hostile referer can't redirect us
  // to an attacker domain after sign-in.
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const auth = requireAuth();
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.replace(next);
      } else if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        router.replace(next);
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setInfo("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      setError(prettifyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const auth = requireAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace(next);
    } catch (err) {
      setError(prettifyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleApple = async () => {
    setError(null);
    setBusy(true);
    try {
      const auth = requireAuth();
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      await signInWithPopup(auth, provider);
      router.replace(next);
    } catch (err) {
      setError(prettifyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
      </h1>
      <p className="mt-2 text-muted text-sm">
        {mode === "signup"
          ? "Free for 2 pets, no card required."
          : mode === "signin"
            ? "Sign in to manage your pets across web + mobile."
            : "We'll email you a reset link."}
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        {mode !== "reset" ? (
          <div className="grid gap-2">
            <Button variant="outline" onClick={handleGoogle} disabled={busy}>
              Continue with Google
            </Button>
            <Button variant="outline" onClick={handleApple} disabled={busy}>
              Continue with Apple
            </Button>
            <div className="my-3 flex items-center gap-3 text-xs text-faint">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        ) : null}

        <form onSubmit={handleEmail} className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
            />
          </label>
          {mode !== "reset" ? (
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium flex items-center justify-between">
                Password
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                      setInfo(null);
                    }}
                    className="text-xs font-normal text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                ) : null}
              </span>
              <input
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface-elevated px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary"
              />
            </label>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {info ? <p className="text-sm text-primary-dark">{info}</p> : null}
          <Button type="submit" disabled={busy} className="mt-2">
            {busy
              ? "Working…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset email"}
          </Button>
        </form>
      </div>

      <div className="mt-5 text-sm text-muted text-center">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              onClick={() => setMode("signup")}
              className="text-primary font-semibold hover:underline"
            >
              Create an account
            </button>
          </>
        ) : mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setMode("signin")}
              className="text-primary font-semibold hover:underline"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Remembered it?{" "}
            <button
              onClick={() => setMode("signin")}
              className="text-primary font-semibold hover:underline"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>

      <p className="mt-12 text-xs text-faint text-center">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function prettifyAuthError(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong.";
  const code = (err as { code?: string }).code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return (err as { message?: string }).message ?? "Something went wrong.";
  }
}

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16">Loading…</div>}>
          <SignInInner />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
