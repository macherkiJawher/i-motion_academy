import { cn } from "@/lib/utils";

export function Marquee({
  items,
  className,
  reverse = false,
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div className={cn("group relative flex overflow-hidden", className)} aria-hidden>
      <div
        className="flex min-w-full shrink-0 items-center gap-10 pr-10 will-change-transform group-hover:[animation-play-state:paused]"
        style={{
          animation: `marquee 34s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
            <span className="font-display text-2xl uppercase tracking-[0.18em] text-muted-foreground/60 md:text-4xl">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-electric shadow-[0_0_16px_var(--electric)]" />
          </span>
        ))}
      </div>
    </div>
  );
}
