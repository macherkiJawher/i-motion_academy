import { Link } from "@tanstack/react-router";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import { Suspense, lazy, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/fx/ClientOnly";
import { Magnetic } from "@/components/fx/Magnetic";
import { Spotlight } from "@/components/fx/AmbientBackdrop";
import { media } from "@/data/media";

const HeroScene = lazy(() => import("@/components/three/HeroScene"));

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  // pointer parallax
  const px = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const py = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const subjX = useTransform(px, [-0.5, 0.5], [22, -22]);
  const subjY = useTransform(py, [-0.5, 0.5], [16, -16]);
  const glowX = useTransform(px, [-0.5, 0.5], [-40, 40]);

  return (
    <section
      ref={ref}
      onPointerMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16 lg:pt-24 lg:pb-0"
    >
      {/* layer 1 — abstract 3D field */}
      <div className="absolute inset-0 opacity-60">
        <ClientOnly>
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </ClientOnly>
      </div>
      <Spotlight />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* layer 4 — copy */}
        <motion.div style={{ y, scale, opacity }} className="text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_12px_var(--mint)]" />
            Formations professionnelles · EMS · coaching · diplômes
          </motion.span>

          <h1 className="mt-7 font-display text-[clamp(2.6rem,7.4vw,5.4rem)] font-semibold uppercase leading-[0.92] tracking-tight">
            {["L'académie", "du mouvement", "et de l'EMS"].map((line, i) => (
              <span key={line} className="block overflow-hidden py-[0.05em]">
                <motion.span
                  className={i === 1 ? "inline-block text-gradient" : "inline-block"}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground lg:mx-0"
          >
            Développez des compétences concrètes en EMS, coaching de performance, bien-être et outils numériques appliqués
            grâce à des programmes pratiques conçus pour le terrain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Magnetic>
              <Button asChild variant="electric" size="lg">
                <Link to="/trainings">
                  Explorer les formations <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Button asChild variant="glass" size="lg">
                <Link to="/btp-bts">
                  <GraduationCap className="h-4 w-4" /> Parcours BTP & BTS
                </Link>
              </Button>
            </Magnetic>
          </motion.div>

        </motion.div>

        {/* layer 2/3 — EMS human focal point */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(18px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ x: subjX, y: subjY }}
          className="relative mx-auto w-full max-w-sm lg:max-w-none"
        >
          <motion.div
            style={{ x: glowX }}
            aria-hidden
            className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-electric/20 blur-[110px]"
          />
          <motion.div
            style={{ y: imgY, scale: imgScale }}
            className="relative overflow-hidden rounded-[46%_46%_38%_38%/32%_32%_16%_16%] border border-border"
          >
            <img
              src={media.emsHero}
              alt="Une personne s'entraîne avec une tenue d'électrostimulation musculaire"
              width={1200}
              height={1600}
              fetchPriority="high"
              className="h-full w-full object-cover [filter:contrast(1.14)_saturate(0.9)_brightness(0.82)]"
            />
            <div className="pointer-events-none absolute inset-0 mix-blend-color opacity-50 [background:linear-gradient(150deg,color-mix(in_oklab,var(--electric)_75%,transparent),transparent_50%,color-mix(in_oklab,var(--violet)_70%,transparent))]" />
            <div className="pointer-events-none absolute inset-0 [background:radial-gradient(110%_90%_at_50%_35%,transparent_35%,color-mix(in_oklab,var(--background)_92%,transparent)_100%)]" />
            <div className="noise pointer-events-none absolute inset-0 opacity-70" />
          </motion.div>

          {/* orbital line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-8%] animate-spin-slow rounded-full border border-electric/20 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
          />
          {/* floating data chips */}
          {[
            { label: "Réglage et sécurité", cls: "left-[-8%] top-[22%]" },
            { label: "Méthodes d'entraînement", cls: "right-[-6%] top-[52%]" },
            { label: "Coaching professionnel", cls: "left-[4%] bottom-[8%]" },
          ].map((chip, i) => (
            <motion.span
              key={chip.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.2, duration: 0.7 }}
              className={`glass absolute hidden rounded-full px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground sm:block ${chip.cls}`}
            >
              <span className="mr-2 inline-block h-1 w-1 rounded-full bg-electric shadow-[0_0_8px_var(--electric)]" />
              {chip.label}
            </motion.span>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 lg:block"
      >
        <div className="flex h-11 w-6 items-start justify-center rounded-full border border-border p-1.5">
          <motion.span
            className="h-2 w-1 rounded-full bg-electric"
            animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
