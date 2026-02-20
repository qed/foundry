import React from 'react';
import { motion } from 'framer-motion';
interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  color?: string;
}
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  showText = true,
  color = '#00d4ff'
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress / 100 * circumference;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size
      }}>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90">

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2e3140"
          strokeWidth={strokeWidth}
          fill="transparent" />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{
            strokeDashoffset: circumference
          }}
          animate={{
            strokeDashoffset: offset
          }}
          transition={{
            duration: 1.5,
            ease: 'easeOut'
          }}
          strokeLinecap="round" />

      </svg>
      {showText &&
      <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-text-primary">
            {progress}%
          </span>
        </div>
      }
    </div>);

}