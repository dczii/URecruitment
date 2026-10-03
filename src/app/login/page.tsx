import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/LoginForm";
export const metadata: Metadata = { title: "Sign in" };
export default function LoginPage() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <section className="flex flex-col justify-between border-b border-border bg-muted/40 px-6 py-8 lg:w-1/2 lg:border-r lg:border-b-0 lg:px-16 lg:py-12">
        <div className="inline-flex w-fit rounded-sm bg-brand-surface p-3"><Image src="/user-logo.png" alt="USER Experience Researchers" width={848} height={145} className="h-auto w-52 max-w-full" priority unoptimized /></div>
        <div className="my-12 hidden max-w-lg lg:block"><p className="text-caption font-semibold uppercase tracking-widest text-primary">Recruitment workspace</p><h2 className="mt-5 text-display font-semibold tracking-tight">Your people.<br />Your next move.</h2><p className="mt-6 max-w-sm text-body text-muted-foreground">Keep your jobs, candidates and next steps together in one focused workspace.</p></div>
        <p className="mt-5 text-caption text-muted-foreground">URecruitment · Fictional data prototype</p>
      </section>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-16"><LoginForm /></div>
    </main>
  );
}
