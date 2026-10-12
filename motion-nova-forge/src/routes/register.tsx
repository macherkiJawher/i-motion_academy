import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { safeReturnPath } from "@/lib/return-path";
import { z } from "zod";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Créer votre compte — i-Motion Academy" },
      { name: "description", content: "Créez votre compte i-Motion Academy pour vous inscrire aux sessions et suivre vos certifications." },
      { property: "og:title", content: "Créer votre compte — i-Motion Academy" },
      { property: "og:description", content: "Créez votre compte i-Motion Academy pour vous inscrire aux sessions et suivre vos certifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const field = "h-11 w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 text-sm outline-none focus:border-electric/50";

function RegisterPage() {
  const { register } = useAuth();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-32">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-semibold">Rejoindre l'académie</h1>
        <p className="mt-2 text-sm text-muted-foreground">Créez votre compte participant en moins d'une minute.</p>
        <form
          className="mt-8 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (form.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
            setLoading(true);
            try {
              await register(form);
              navigate({ to: safeReturnPath(returnTo) ?? "/dashboard", replace: true });
            } catch {
              setError("La création du compte a échoué. Vérifiez les informations puis réessayez.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="text-xs text-muted-foreground">Prénom
            <input required maxLength={80} className={field} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground">Nom
            <input required maxLength={80} className={field} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Adresse e-mail
            <input type="email" required maxLength={160} className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Téléphone
            <input required maxLength={30} className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Mot de passe
            <input type="password" required maxLength={72} className={field} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" variant="electric" className="w-full" disabled={loading}>{loading ? "Création…" : "Créer un compte"}</Button>
          </div>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">
          Déjà inscrit ? <Link to="/login" search={returnTo ? { returnTo } : undefined} className="text-electric hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
