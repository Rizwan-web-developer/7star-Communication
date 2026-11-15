"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Lock, Store, User } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; redirectTo?: string };
      if (!res.ok) throw new Error(data.message || "Login failed.");
      router.push(data.redirectTo || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Store className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">7 Communication</h1>
          <p className="mt-1 text-sm text-muted">Mobile Accessories Shop Panel — Sign in</p>
        </div>

        {error ? (
          <div role="alert" className="mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-foreground">Email or username</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input id="identifier" type="text" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted" placeholder="Email or username" />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus-ring h-10 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted" placeholder="Password" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
