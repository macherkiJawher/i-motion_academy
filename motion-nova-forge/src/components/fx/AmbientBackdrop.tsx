import { cn } from "@/lib/utils";

/** Ambient floating gradient blobs + grid, used as page background. */
export function AmbientBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
      <div className="absolute -left-32 top-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet/20 blur-[140px] animate-pulse-glow" />
      <div className="absolute -right-40 top-40 h-[32rem] w-[32rem] rounded-full bg-electric/20 blur-[150px] animate-pulse-glow [animation-delay:1.5s]" />
      <div className="absolute bottom-[-14rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-mint/10 blur-[160px] animate-pulse-glow [animation-delay:3s]" />
      <div className="noise absolute inset-0" />
    </div>
  );
}

/** Pointer-following spotlight for hero areas. */
export function Spotlight({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(600px_circle_at_var(--mx,50%)_var(--my,40%),color-mix(in_oklab,var(--electric)_14%,transparent),transparent_70%)]",
        className,
      )}
    />
  );
}
