import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import homeBg from '/helix-home-bg.jpeg?url';

interface HomePageProps {
  onEnter: () => void;
}

export function HomePage({ onEnter }: HomePageProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${homeBg})` }}
      />

      {/* Subtle dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Enter button - top right */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-10">
        <motion.button
          onClick={onEnter}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="group flex items-center gap-2 sm:gap-3 px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/40 text-text-primary font-semibold text-sm sm:text-base tracking-wide backdrop-blur-md transition-all duration-300 hover:border-accent-cyan/70 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:from-accent-cyan/30 hover:to-accent-purple/30 cursor-pointer"
        >
          Enter Foundry
          <ArrowRight
            size={18}
            className="text-accent-cyan transition-transform duration-300 group-hover:translate-x-1"
          />
        </motion.button>
      </div>
    </div>
  );
}
