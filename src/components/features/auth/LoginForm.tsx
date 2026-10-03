"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { requestCode, verifyCode } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/field";
import { emailSchema } from "@/lib/auth-schema";
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => { if (step === "code" && !pending) codeInput.current?.focus(); }, [step, pending]);
  function send() {
    setError("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError("Enter a valid work email."); return; }
    startTransition(async () => {
      try {
        const result = await requestCode(parsed.data);
        if (!result.ok) { setError(result.error); return; }
        setEmail(parsed.data); setCode(""); setStep("code"); setCooldown(60);
      } catch { setError("Login is temporarily unavailable. Please try again."); }
    });
  }
  function verify() {
    setError("");
    startTransition(async () => {
      try {
        const result = await verifyCode(email, code);
        if (!result.ok) setError(result.error);
      } catch { setError("Login is temporarily unavailable. Please try again."); }
    });
  }
  return (
    <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="login-title">
      <span className="mb-6 inline-flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden="true">{step === "email" ? <ShieldCheck className="size-5" /> : <Mail className="size-5" />}</span>
      <h1 id="login-title" className="text-title font-semibold tracking-tight">{step === "email" ? "Sign in to your workspace" : "Check your inbox"}</h1>
      <p className="mt-3 text-body text-muted-foreground">{step === "email" ? "Use your approved work email. We’ll send you a one-time login code." : "If this email is approved, a login code will arrive shortly."}</p>
      {step === "code" && <p className="mt-3 break-all text-label font-semibold">{email}</p>}
      <form className="mt-7 flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (step === "email") send(); else verify(); }} aria-busy={pending}>
        <div className="flex flex-col gap-2">
          {step === "email" ? <><FieldLabel htmlFor="login-email">Work email</FieldLabel><Input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} placeholder="you@company.com" /></> : <><FieldLabel htmlFor="login-code">Six-digit code</FieldLabel><Input ref={codeInput} id="login-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} disabled={pending} aria-invalid={Boolean(error)} aria-describedby="code-help login-error" className="text-center font-mono tracking-widest" placeholder="000000" /><p id="code-help" className="text-caption text-muted-foreground">Your code expires in 10 minutes.</p></>}
        </div>
        <div id="login-error" role="alert" className={error ? "flex items-start gap-2 text-label text-destructive" : "sr-only"}>{error && <><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{error}</span></>}</div>
        <Button type="submit" size="lg" disabled={pending} className="w-full"><span className="inline-flex items-center gap-2 text-primary-foreground">{pending ? "Please wait…" : step === "email" ? "Send login code" : "Verify and sign in"}<ArrowRight className="size-4" aria-hidden="true" /></span></Button>
        {step === "code" && <div className="flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="ghost" disabled={pending || cooldown > 0} onClick={send}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</Button><Button type="button" variant="link" disabled={pending} onClick={() => { setStep("email"); setCode(""); setError(""); }}>Change email</Button></div>}
      </form>
      <p className="mt-7 border-t border-border pt-5 text-caption text-muted-foreground">Access is limited to approved recruiters. Contact your workspace administrator if you need access.</p>
    </section>
  );
}
