import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal, RevealText } from "@/components/fx/Reveal";
import { EmsImage } from "@/components/fx/EmsImage";
import { media } from "@/data/media";

/**
 * Cinematic scroll-driven EMS sequence — the visitor "enters" a session:
 * the frame opens, the camera pushes in, labels arrive, pillars resolve.
 */
export function EmsStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const width = useTransform(scrollYProgress, [0, 0.35], ["72%", "100%"]);
  const radius = useTransform(scrollYProgress, [0, 0.35], ["3rem", "1.25rem"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.35]);
  const overlay = useTransform(scrollYProgress, [0.1, 0.5], [0.75, 0.25]);
  const labelOpacity = useTransform(scrollYProgress, [0.25, 0.4, 0.7, 0.85], [0, 1, 1, 0]);
  const pillarsOpacity = useTransform(scrollYProgress, [0.62, 0.8], [0, 1]);
  const pillarsY = useTransform(scrollYProgress, [0.62, 0.85], [40, 0]);
  const introOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);

  const labels = [
    { text: "Electrode placement", cls: "left-[8%] top-[24%]" },
    { text: "Impulse calibration", cls: "right-[8%] top-[44%]" },
    { text: "Movement under load", cls: "left-[14%] bottom-[22%]" },
  ];

  return (
    <section ref={ref} className="relative h-[320svh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        <motion.div
          style={{ width, borderRadius: radius }}
          className="relative h-[76svh] overflow-hidden border border-border"
        >
          <motion.img
            style={{ scale: imgScale }}
            src={media.emsGroup}
            alt="Coach leading an EMS group training session in a dark studio"
            width={1600}
            height={1104}
            loading="lazy"
            className="h-full w-full object-cover [filter:contrast(1.12)_saturate(0.92)_brightness(0.8)]"
          />
          <div className="pointer-events-none absolute inset-0 mix-blend-color opacity-45 [background:linear-gradient(140deg,color-mix(in_oklab,var(--electric)_70%,transparent),transparent_48%,color-mix(in_oklab,var(--violet)_65%,transparent))]" />
          <motion.div
            style={{ opacity: overlay }}
            className="pointer-events-none absolute inset-0 bg-background"
          />
          <div className="noise pointer-events-none absolute inset-0 opacity-60" />

          {/* 01 — intro */}
          <motion.div
            style={{ opacity: introOpacity }}
            className="absolute inset-0 flex items-center justify-center px-6 text-center"
          >
            <div>
              <span className="text-xs uppercase tracking-[0.35em] text-electric">
                01 — The technology
              </span>
              <p className="mt-4 font-display text-[clamp(1.8rem,5vw,3.4rem)] font-semibold uppercase leading-[1.02]">
                Step inside an
                <br />
                EMS session
              </p>
            </div>
          </motion.div>

          {/* informational labels */}
          {labels.map((l, i) => (
            <motion.div
              key={l.text}
              style={{ opacity: labelOpacity }}
              className={`absolute hidden sm:block ${l.cls}`}
            >
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
                className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]" />
                {l.text}
              </motion.span>
            </motion.div>
          ))}

          {/* pillars */}
          <motion.div
            style={{ opacity: pillarsOpacity, y: pillarsY }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent px-6 pb-10 pt-24"
          >
            <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
              {["EMS technology", "Training methodology", "Professional coaching"].map((p, i) => (
                <span
                  key={p}
                  className="glass rounded-2xl px-4 py-4 text-center font-display text-sm font-semibold uppercase tracking-[0.12em]"
                >
                  <span className="mr-2 text-electric">0{i + 1}</span>
                  {p}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------------------- Interactive EMS anatomy -- */

const markers = [
  {
    x: 24,
    y: 30,
    title: "Chest & back channels",
    detail:
      "Channel mapping across the large muscle groups — the first calibration exercise of the suit lab.",
  },
  {
    x: 62,
    y: 24,
    title: "Electrode contact",
    detail:
      "Moistening, pad seating and strap tension. Poor contact is the number one cause of an uneven session.",
  },
  {
    x: 45,
    y: 62,
    title: "Cable routing",
    detail:
      "Clean routing keeps the client free to move and keeps the coach's hands on technique, not hardware.",
  },
  {
    x: 78,
    y: 66,
    title: "Intensity control",
    detail:
      "Per-channel intensity is set with the client, verbally checked and re-checked at every ramp.",
  },
];

export function EmsAnatomy() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <Reveal>
            <span className="text-xs uppercase tracking-[0.3em] text-electric">
              The suit, explained
            </span>
          </Reveal>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.2vw,3.2rem)] font-semibold uppercase leading-[1.03]">
            <RevealText text="Every strap is a skill." />
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Hover the markers to see what you learn to control in the suit lab. Everything here is
              trained hands-on, on real equipment, with a real client in front of you.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <EmsImage
            src={media.emsEquipment}
            alt="Close-up of EMS suit electrodes and cable connectors"
            width={1600}
            height={1104}
            interactive
            className="aspect-[4/3]"
          >
            {markers.map((m, i) => (
              <div
                key={m.title}
                className="group/marker absolute"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <motion.button
                  type="button"
                  aria-label={m.title}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex h-5 w-5 items-center justify-center rounded-full border border-electric/60 bg-background/60 backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-electric shadow-[0_0_12px_var(--electric)]" />
                </motion.button>
                <div className="pointer-events-none absolute left-1/2 top-7 z-20 w-56 -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-300 group-hover/marker:translate-y-0 group-hover/marker:opacity-100">
                  <div className="glass-strong rounded-2xl p-4 text-left">
                    <p className="font-display text-sm font-semibold">{m.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {m.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </EmsImage>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Coach section -- */

const coachThemes = [
  {
    n: "01",
    t: "EMS Technology",
    d: "Impulse parameters, suit architecture and machine handling.",
  },
  {
    n: "02",
    t: "Training Methodology",
    d: "Structuring the 20-minute session and progression over blocks.",
  },
  {
    n: "03",
    t: "Safety & Contraindications",
    d: "Screening, medical flags and how to stop a session correctly.",
  },
  {
    n: "04",
    t: "Practical Training",
    d: "Supervised suit labs on real clients, scored on protocol.",
  },
  { n: "05", t: "Personalized Sessions", d: "Adapting protocols to profile, goal and tolerance." },
  {
    n: "06",
    t: "Coaching & Client Acquisition",
    d: "Consultation, retention and building a client base.",
  },
];

export function CoachSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border">
          <motion.img
            style={{ y: imgY }}
            src={media.emsCoach}
            alt="EMS coach adjusting a client's suit next to a stimulation unit"
            width={1600}
            height={1104}
            loading="lazy"
            className="absolute inset-0 h-[116%] w-full object-cover [filter:contrast(1.1)_saturate(0.9)_brightness(0.55)]"
          />
          <div className="pointer-events-none absolute inset-0 mix-blend-color opacity-45 [background:linear-gradient(140deg,color-mix(in_oklab,var(--electric)_70%,transparent),transparent_50%,color-mix(in_oklab,var(--violet)_65%,transparent))]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/20" />
          <div className="noise pointer-events-none absolute inset-0 opacity-60" />

          <div className="relative px-6 py-16 md:px-14 md:py-20">
            <span className="text-xs uppercase tracking-[0.3em] text-mint">EMS Coach Pro</span>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(2rem,5vw,3.6rem)] font-semibold uppercase leading-[1.0]">
              <RevealText text="Train the coach." />
              <br />
              <span className="text-gradient">
                <RevealText text="Not just the athlete." delay={0.2} />
              </span>
            </h2>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {coachThemes.map((c, i) => (
                <Reveal key={c.t} delay={i * 0.06}>
                  <div className="glass hover-lift h-full rounded-2xl p-5">
                    <span className="font-display text-xs tracking-[0.2em] text-electric">
                      {c.n}
                    </span>
                    <p className="mt-2 font-display text-base font-semibold">{c.t}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
