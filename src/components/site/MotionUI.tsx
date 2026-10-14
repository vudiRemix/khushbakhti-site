"use client";

import Link from "next/link";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const AnimatedLink = motion.create(Link);

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function DishLink({ href, children }: { href: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatedLink href={href} className="dish-preview"
      whileHover={reduced ? undefined : { y: -5 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      {children}
    </AnimatedLink>
  );
}
