import { NextResponse } from "next/server";

export function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  throw new Error("Sentry server test error (deliberate)");
}
