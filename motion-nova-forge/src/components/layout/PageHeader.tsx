import type { ReactNode } from "react";
import { Reveal, RevealText } from "@/components/fx/Reveal";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative mx-auto max-w-6xl px-6 pb-14 pt-40">
      <Reveal>
        <span className="text-xs uppercase tracking-[0.3em] text-electric">{eyebrow}</span>
      </Reveal>
      <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.4rem)] font-semibold leading-[1.02]">
        <RevealText text={title} />
      </h1>
      {description && (
        <Reveal delay={0.15}>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </Reveal>
      )}
      {children && <Reveal delay={0.25}>{children}</Reveal>}
    </header>
  );
}
