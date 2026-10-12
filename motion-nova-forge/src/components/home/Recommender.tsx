import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { catalogService } from "@/services";
import type { AxisCode } from "@/types/domain";
import {
  isPublishableTraining,
  trainingCategory,
  trainingTitle,
} from "@/lib/training-catalog";

export function Recommender() {
  const [selectedAxis, setSelectedAxis] = useState<AxisCode | null>(null);
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => catalogService.trainings(),
  });
  const trainings = data.filter(isPublishableTraining);
  const axes = Array.from(new Set(trainings.map((training) => training.axisCode)));
  const matchingTrainings = trainings.filter((training) => training.axisCode === selectedAxis);

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Sparkles className="h-4 w-4 text-mint" /> Choisir un domaine
      </div>
      {isLoading && <p className="mt-5 text-sm text-muted-foreground">Chargement des formations…</p>}
      {isError && (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">Impossible de charger les domaines disponibles.</p>
          <Button variant="glass" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
        </div>
      )}
      {!isLoading && !isError && axes.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">Aucune formation complète n'est publiée actuellement.</p>
      )}
      {!isLoading && !isError && axes.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {axes.map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => setSelectedAxis(axis)}
                aria-pressed={selectedAxis === axis}
                className={`rounded-full border px-3 py-2 text-xs transition-colors ${selectedAxis === axis ? "border-electric bg-electric/10 text-electric" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {trainingCategory(axis)}
              </button>
            ))}
          </div>
          {selectedAxis && (
            <ul className="mt-5 divide-y divide-border/70 border-y border-border/70">
              {matchingTrainings.map((training) => (
                <li key={training.id}>
                  <Link
                    to="/trainings/$slug"
                    params={{ slug: training.slug }}
                    className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-electric"
                  >
                    {trainingTitle(training)} <ArrowUpRight className="h-4 w-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}