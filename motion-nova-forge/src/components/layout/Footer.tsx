import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { Marquee } from "@/components/fx/Marquee";

const columns = [
  {
    title: "Académie",
    links: [
      { to: "/trainings", label: "Catalogue de formations" },
      { to: "/sessions", label: "Sessions à venir" },
      { to: "/about", label: "Notre histoire" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Compte",
    links: [
      { to: "/login", label: "Connexion" },
      { to: "/register", label: "Créer un compte" },
      { to: "/dashboard/profile", label: "Profil" },
      { to: "/dashboard", label: "Tableau de bord" },
    ],
  },
  {
    title: "Espaces",
    links: [
      { to: "/admin", label: "Administration" },
      { to: "/dashboard", label: "Participant" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-border/60">
      <Marquee
        className="border-b border-border/60 py-6"
        items={["Formations EMS", "Bien-être", "Coaching", "BTP & BTS", "Langues"]}
      />
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-electric)]">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="font-display text-sm font-semibold">i-Motion Academy</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            L'écosystème de formation pour la prochaine génération de professionnels du mouvement — EMS, coaching et IA appliquée.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs uppercase tracking-[0.22em] text-muted-foreground/70">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-electric"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-border/60 px-6 py-6 text-xs text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} i-Motion Academy. Tous droits réservés.</p>
        <p>Conçu pour les personnes qui bougent.</p>
      </div>
    </footer>
  );
}
