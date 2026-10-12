import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/fx/Reveal";
import { TiltCard } from "@/components/fx/Magnetic";
import { TrainingCard } from "@/components/home/TrainingCard";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { catalogService } from "@/services";
import type { Training as ApiTraining } from "@/types/domain";
import {
  formatCatalogMoney,
  isPublishableTraining,
  localizedTrainingText,
  trainingCategory,
  trainingTitle,
} from "@/lib/training-catalog";
import { z } from "zod";

const categories = ["All", "Sport & EMS", "Bien-être & Nutrition", "Langues", "Gestion", "Intelligence artificielle"] as const;

const field =
  "h-10 w-full rounded-xl border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus:border-electric/50";

export const Route = createFileRoute("/trainings/")({
  validateSearch: z.object({
    category: z.enum(categories).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Catalogue de formations — i-Motion Academy" },
      {
        name: "description",
        content:
          "Parcourez les programmes i-Motion dans les parcours sport, bien-être et langues.",
      },
      { property: "og:title", content: "Catalogue de formations — i-Motion Academy" },
      { property: "og:description", content: "Programmes certifiants pour professionnels du mouvement." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const { category: categoryFromUrl } = Route.useSearch();
  const { data: apiTrainings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const trainings = apiTrainings.filter(
    (training) =>
      training.axisCode !== "BTP" &&
      training.axisCode !== "BTS" &&
      isPublishableTraining(training),
  );
  const categoryOptions = ["All", ...new Set(trainings.map((training) => trainingCategory(training.axisCode)))];
  const [category, setCategory] = useState<(typeof categories)[number]>(categoryFromUrl ?? "All");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(1500);

  useEffect(() => {
    setCategory(categoryFromUrl ?? "All");
  }, [categoryFromUrl]);

  const results = useMemo(
    () =>
      trainings.filter(
        (t) =>
          (category === "All" || trainingCategory(t.axisCode) === category) &&
          t.price <= maxPrice &&
          `${trainingTitle(t)} ${localizedTrainingText(t, t.description) ?? ""} ${trainingCategory(t.axisCode)}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query, maxPrice, trainings],
  );

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Choisissez votre orbite."
        description="Découvrez les formations réellement publiées par l'académie. Les statuts de certification et d'homologation sont indiqués pour chaque programme."
      />

      <section className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="glass-strong flex flex-col gap-6 rounded-3xl p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un programme"
                aria-label="Rechercher un programme"
                className="glass h-11 w-full rounded-full pl-11 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus:shadow-[0_0_28px_-8px_var(--electric)]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors",
                    category === c
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {category === c && (
                    <motion.span
                      layoutId="pill"
                      className="absolute inset-0 rounded-full bg-[image:var(--gradient-electric)]"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    />
                  )}
                  <span className="relative">{c === "All" ? "Toutes" : c}</span>
                </button>
              ))}
            </div>

            <div className="w-full lg:w-52">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Prix maximum</span>
                <span className="text-electric">{formatCatalogMoney(maxPrice, "TND")}</span>
              </div>
              <Slider
                className="mt-3"
                value={[maxPrice]}
                min={300}
                max={1500}
                step={50}
                onValueChange={(v) => setMaxPrice(v[0] ?? 1500)}
                aria-label="Prix maximum en dinars tunisiens"
              />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {results.length} formation{results.length === 1 ? "" : "s"}
        </p>
            {isLoading && <p className="mt-6 text-sm text-muted-foreground">Chargement des formations…</p>}
            {isError && (
              <div className="glass mt-6 rounded-3xl p-8 text-center">
                <p className="text-sm text-muted-foreground">Impossible de charger le catalogue.</p>
                <Button variant="glass" className="mt-4" onClick={() => void refetch()}>Réessayer</Button>
              </div>
            )}
        <motion.div layout className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((t) => (
              <motion.div
                key={t.slug}
                layout
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative h-full">
                  <TrainingCard training={t} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {!isLoading && !isError && results.length === 0 && (
          <div className="glass mt-8 rounded-3xl p-14 text-center text-sm text-muted-foreground">
            Aucune formation ne correspond à ces critères.
          </div>
        )}
      </section>

    </>
  );
}
