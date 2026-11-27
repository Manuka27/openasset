"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export default function SignOut({ compact }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out failed");
      window.location.replace("/login");
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <>
      <button className={compact ? "oa-nav-link w-full" : "button"} type="button" onClick={signOut} disabled={pending}>
        <LogOut aria-hidden="true" />
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="text-rose-300">Could not sign out. Try again.</p>}
    </>
  );
}
