"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { eventsApi } from "@/lib/site";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

// Shared by /admin and /admin/shops, so signing in to one opens the other in the same tab.
export const ADMIN_TOKEN_KEY = "prebook-admin-token";
export const SESSION_ENDED = "Your session has ended. Sign in again.";

/** Ends the server session; the dashboard clears its own state either way. */
export function endAdminSession(token: string | null) {
  if (!token) return;
  fetch(`${eventsApi}/admin-auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export default function AdminSignIn({
  brand,
  title,
  error,
  opening,
  onToken,
}: {
  brand: ReactNode;
  title: string;
  error: string;
  opening: boolean;
  onToken: (token: string) => void;
}) {
  const [problem, setProblem] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credentials = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setProblem("");
    try {
      const response = await fetch(`${eventsApi}/admin-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        return setProblem(body.error ?? "Couldn’t sign in. Try again.");
      onToken(body.token);
    } catch {
      setProblem("Couldn’t reach the server. Check your connection and retry.");
    } finally {
      setSending(false);
    }
  }

  const busy = sending || opening;
  return (
    <main className="admin-gate">
      <Card className="register-card admin-card gap-0 shadow-none">
        <form className="flex flex-col gap-[22px]" onSubmit={submit}>
          {brand}
          <h1>{title}</h1>
          <Field className="field">
            <FieldLabel htmlFor="admin-email">Email</FieldLabel>
            <Input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </Field>
          <Field className="field">
            <FieldLabel htmlFor="admin-password">Password</FieldLabel>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <FieldError>{problem || error}</FieldError>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
