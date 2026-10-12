import { motion, useMotionValue, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Consistent cinematic treatment for every EMS photograph:
 * dark grading, cyan highlight, violet glow, vignette, grain and glass edge.
 */
export function EmsImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  width,
  height,
  interactive = false,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  interactive?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });

  return (
    <motion.div
      ref={ref}
      style={interactive ? { rotateX: rx, rotateY: ry, transformPerspective: 1200 } : {}}
      onPointerMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        ref.current?.style.setProperty("--gx", `${px * 100}%`);
        ref.current?.style.setProperty("--gy", `${py * 100}%`);
        if (interactive) {
          rx.set((0.5 - py) * 6);
          ry.set((px - 0.5) * 6);
        }
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-border bg-surface",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className={cn(
          "h-full w-full object-cover [filter:contrast(1.12)_saturate(0.92)_brightness(0.86)] transition-transform duration-[1200ms] ease-out",
          imgClassName,
        )}
      />
      {/* cyan / violet grading */}
      <div className="pointer-events-none absolute inset-0 mix-blend-color opacity-45 [background:linear-gradient(140deg,color-mix(in_oklab,var(--electric)_70%,transparent),transparent_45%,color-mix(in_oklab,var(--violet)_65%,transparent))]" />
      {/* cursor-following light */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(28rem_circle_at_var(--gx,50%)_var(--gy,50%),color-mix(in_oklab,var(--cyan)_16%,transparent),transparent_70%)]" />
      {/* vignette + floor fade */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_100%_at_50%_40%,transparent_35%,color-mix(in_oklab,var(--background)_85%,transparent)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
      <div className="noise pointer-events-none absolute inset-0 opacity-60" />
      {children}
    </motion.div>
  );
}
