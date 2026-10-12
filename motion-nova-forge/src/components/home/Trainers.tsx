import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight, HeartPulse, Languages, Zap } from "lucide-react";
import { Reveal, RevealText } from "@/components/fx/Reveal";
import { EmsImage } from "@/components/fx/EmsImage";
import { media, trainers } from "@/data/media";

/* ------------------------------------------------------------- Trainers -- */

export function Trainers() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <span className="text-xs uppercase tracking-[0.3em] text-electric">The faculty</span>
      </Reveal>
      <h2 className="mt-4 font-display text-[clamp(2rem,4.2vw,3.2rem)] font-semibold uppercase leading-[1.03]">
        <RevealText text="Taught by practising EMS professionals." />
      </h2>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {trainers.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08}>
            <article className="group relative h-full overflow-hidden rounded-[2rem] border border-border">
              <img
                src={p.photo}
                alt={`${p.name}, ${p.speciality}`}
                width={1008}
                height={1408}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover [filter:contrast(1.1)_saturate(0.9)_brightness(0.82)] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
              />
              <div className="pointer-events-none absolute inset-0 mix-blend-color opacity-40 [background:linear-gradient(150deg,color-mix(in_oklab,var(--electric)_70%,transparent),transparent_55%,color-mix(in_oklab,var(--violet)_65%,transparent))]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="noise pointer-events-none absolute inset-0 opacity-60" />

              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="text-[0.62rem] uppercase tracking-[0.24em] text-electric">
                  {p.speciality}
                </span>
                <h3 className="mt-1.5 font-display text-xl font-semibold transition-colors duration-300 group-hover:text-gradient">
                  {p.name}
                </h3>
                <p className="mt-2 max-h-0 overflow-hidden text-xs leading-relaxed text-muted-foreground opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100">
                  {p.bio}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="glass rounded-full px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-3 border-t border-border/70 pt-3 text-[0.66rem] text-muted-foreground">
                  {p.sessions}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Three paths --- */

const axes = [
  {
    id: "Sport & EMS",
    icon: Zap,
    flagship: true,
    line: "EMS, coaching, Pilates, fitness and physical preparation.",
    image: media.emsStudio,
    accent: "from-electric/25",
  },
  {
    id: "Bien-être & Nutrition",
    icon: HeartPulse,
    flagship: false,
    line: "Yoga, mobility, stretching and sports nutrition.",
    accent: "from-cyan/20",
  },
  {
    id: "Langues",
    icon: Languages,
    flagship: false,
    line: "French, English, German, Italian, Spanish and Chinese.",
    accent: "from-electric/20",
  },
];

export function Axes() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <span className="text-xs uppercase tracking-[0.3em] text-electric">Three training paths</span>
      </Reveal>
      <h2 className="mt-4 max-w-xl font-display text-[clamp(2rem,4.2vw,3.2rem)] font-semibold uppercase leading-[1.03]">
        <RevealText text="One academy, three focused learning paths." />
      </h2>

      <div className="mt-14 space-y-4">
        {axes.map((a, i) => (
          <Reveal key={a.id} delay={i * 0.08}>
            <motion.div
              whileHover={{ x: 8 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
            >
              <Link
                to="/trainings"
                className={`glass hover-lift group relative flex items-center gap-5 overflow-hidden rounded-3xl p-6 ${
                  a.flagship ? "md:p-10" : ""
                }`}
              >
                {a.flagship && a.image && (
                  <>
                    <img
                      src={a.image}
                      alt="i-Motion EMS studio"
                      width={1600}
                      height={1104}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-40 [filter:contrast(1.1)_brightness(0.7)] transition-transform duration-[1400ms] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
                  </>
                )}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${a.accent} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />

                <span className="glass relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-electric transition-transform duration-500 group-hover:scale-110">
                  <a.icon className="h-5 w-5" />
                </span>
                <div className="relative flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3
                      className={`font-display font-semibold uppercase leading-tight ${
                        a.flagship ? "text-[clamp(1.5rem,3.4vw,2.4rem)] text-gradient" : "text-lg"
                      }`}
                    >
                      {a.id}
                    </h3>
                    {a.flagship && (
                      <span className="rounded-full border border-electric/50 px-3 py-1 text-[0.58rem] uppercase tracking-[0.18em] text-electric">
                        Flagship
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {a.line}
                  </p>
                </div>
                <ArrowUpRight className="relative h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-electric" />
              </Link>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
