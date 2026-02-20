"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-bg-primary">
      {/* Background image — contain on mobile to show full logo, cover on desktop */}
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat md:bg-cover"
        style={{ backgroundImage: "url(/helix-home-bg.jpeg)" }}
      />

      {/* Overlay for contrast */}
      <div className="absolute inset-0 bg-black/10 md:bg-black/20" />

      {/* Login / Signup - top right */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          className="flex gap-3"
        >
          <Link href="/login" className="btn-primary text-text-primary text-sm">
            Login
          </Link>
          <Link
            href="/signup"
            className="btn-secondary text-text-primary text-sm"
          >
            Sign Up
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
