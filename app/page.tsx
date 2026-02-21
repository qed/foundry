"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/context";

export default function Home() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-bg-primary">
      {/* Background image — contain on mobile to show full logo, cover on desktop */}
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat md:bg-cover"
        style={{ backgroundImage: "url(/helix-home-bg.jpeg)" }}
      />

      {/* Overlay for contrast */}
      <div className="absolute inset-0 bg-black/10 md:bg-black/20" />

      {/* Auth controls - top right */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-text-tertiary text-sm">Loading...</span>
          ) : user ? (
            <>
              <Link
                href="/org"
                className="px-5 py-2 bg-accent-cyan hover:bg-accent-cyan/80 text-bg-primary rounded-lg font-semibold text-sm transition-colors"
              >
                Enter
              </Link>
              <button
                onClick={() => signOut()}
                className="btn-secondary text-text-primary text-sm cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-primary text-text-primary text-sm">
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-secondary text-text-primary text-sm"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
