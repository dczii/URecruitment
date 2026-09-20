import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC } from "next/font/google";
import { headers } from "next/headers";

import { AppShell } from "@/components/patterns/AppShell";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  weight: "variable",
  preload: false,
});

export const metadata: Metadata = {
  title: "URecruitment",
  description: "AI-assisted recruitment portal (MVP prototype, fictional data)",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Next.js applies the nonce to framework scripts from the CSP header.
  const nonce = (await headers()).get("x-nonce");
  void nonce;

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${notoSansSc.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
