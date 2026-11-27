"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

const subscribeToHydration = () => () => {};

export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email")).trim().toLowerCase(), password: form.get("password") }),
      });
      if (response.ok) {
        router.replace("/dashboard");
        return;
      }
      if (response.status === 429) setError("Too many attempts. Try again in a minute.");
      else if (response.status === 401 || response.status === 400) setError("Sign-in failed. Check your email and password.");
      else setError("Sign-in is temporarily unavailable. Try again.");
    } catch {
      setError("Could not reach OpenAsset. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={signIn} className="grid gap-4">
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <div className="relative">
        <label>Password<input name="password" className="pr-14" type={showPassword ? "text" : "password"} autoComplete="current-password" required /></label>
        <button type="button" className="button oa-icon-button absolute right-1 bottom-0.5 border-transparent bg-transparent" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>
          {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error && <p role="alert" className="oa-feedback">{error}</p>}
      <button className="button primary min-h-11" disabled={!hydrated || pending}>
        {pending ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
