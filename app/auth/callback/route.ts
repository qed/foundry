import { NextResponse } from "next/server";

// Placeholder for Supabase OAuth callback (Phase 003)
export async function GET() {
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
