"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Alert, AlertDescription } from "./ui/alert";
export function AuthForm() {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    try {
      const email = String(form.get("email")),
        password = String(form.get("password"));
      const result = register
        ? await authClient.signUp.email({ email, password, name: "Operator" })
        : await authClient.signIn.email({ email, password });
      if (result.error) setError(result.error.message ?? "Unable to sign in.");
    } catch {
      setError("Unable to reach authentication. Check backend configuration.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-wrap">
      <div className="auth-panel">
        <div>
          <p className="brand">Company Operator</p>
          <h1 className="mt-6">
            {register ? "Create your operator account" : "Welcome back"}
          </h1>
          <p className="muted">
            Sign in to inspect your company and its next experiment.
          </p>
        </div>
        <form action={submit} className="stack">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={12}
                required
              />
            </Field>
          </FieldGroup>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button disabled={busy} type="submit">
            {busy ? "Connecting…" : register ? "Create account" : "Sign in"}
          </Button>
        </form>
        <Button
          variant="ghost"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Back to sign in" : "First time? Create operator account"}
        </Button>
        <p className="muted text-xs">
          Better Auth · Registration must be enabled for the configured operator
          email.
        </p>
      </div>
    </main>
  );
}
