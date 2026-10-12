import { motion, useInView } from "framer-motion";
import type { ReactNode } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 42 },
  down: { x: 0, y: -42 },
  left: { x: 42, y: 0 },
  right: { x: -42, y: 0 },
  none: { x: 0, y: 0 },
};

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  blur = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  blur?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const o = offsets[direction];

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, ...o, filter: blur ? "blur(14px)" : "none" }}
      animate={inView ? { opacity: 1, x: 0, y: 0, filter: "blur(0px)" } : { opacity: 0, ...o, filter: blur ? "blur(14px)" : "none" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Word-by-word masked headline reveal. */
export function RevealText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <span ref={ref} className={cn("inline-flex flex-wrap", className)}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} className="overflow-hidden py-[0.06em] pr-[0.28em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }}
            transition={{ duration: 0.85, delay: delay + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
