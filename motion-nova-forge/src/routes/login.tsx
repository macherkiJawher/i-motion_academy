import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { homeForRole, useAuth } from "@/hooks/useAuth";
import { safeReturnPath } from "@/lib/return-path";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Connexion — i-Motion Academy" },
      { name: "description", content: "Accédez à votre espace participant ou administrateur i-Motion Academy." },
      { property: "og:title", content: "Connexion — i-Motion Academy" },
      { property: "og:description", content: "Accédez à votre espace participant ou administrateur i-Motion Academy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const field = "h-11 w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 text-sm outline-none focus:border-electric/50";

function LoginPage() {
  const { login, loginWithGoogle, completeGoogleLogin } = useAuth();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finalizeAuth = (user: { role: string; id: string } | null) => {
    if (!user) return;
    navigate({ to: safeReturnPath(returnTo) ?? homeForRole(user.role as any), replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const role = params.get("role");
    const userId = params.get("userId");
    const returnPath = params.get("returnTo") ?? returnTo;

    if (!token || !userId || !role) return;

    void completeGoogleLogin(token).then((user) => {
      const nextReturnTo = returnPath ?? safeReturnPath(returnTo);
      navigate({ to: nextReturnTo ?? homeForRole(user.role), replace: true });
    }).catch(() => {
      setError("Connexion avec Google impossible pour le moment.");
    });
  }, [completeGoogleLogin, navigate, returnTo]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-32">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-semibold">Bon retour</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connectez-vous à votre espace académie.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const user = await login(email, password);
              navigate({ to: safeReturnPath(returnTo) ?? homeForRole(user.role), replace: true });
            } catch {
              setError("Connexion impossible. Vérifiez vos informations puis réessayez.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="block text-xs text-muted-foreground">Adresse e-mail
            <input type="email" required maxLength={160} className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-xs text-muted-foreground">Mot de passe
            <input type="password" required maxLength={72} className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" variant="electric" className="w-full" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</Button>
        </form>
        <div className="my-6 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-px flex-1 bg-border/60" />ou<span className="h-px flex-1 bg-border/60" />
        </div>
        <Button
          type="button"
          variant="glass"
          className="w-full gap-3"
          disabled={loading}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              const user = await loginWithGoogle();
              navigate({ to: safeReturnPath(returnTo) ?? homeForRole(user.role), replace: true });
            } catch {
              setError("Connexion avec Google impossible pour le moment.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2z" />
            <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.7-4.1l-3.3 2.5A10 10 0 0 0 12 22z" />
            <path fill="#FBBC05" d="M6.3 14a6 6 0 0 1 0-3.9L3 7.6a10 10 0 0 0 0 8.9z" />
            <path fill="#4285F4" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3 7.6l3.3 2.5A6 6 0 0 1 12 6z" />
          </svg>
          Continuer avec Google
        </Button>
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/forgot-password" className="hover:text-electric">Mot de passe oublié ?</Link>
          <Link to="/register" search={returnTo ? { returnTo } : undefined} className="hover:text-electric">Créer un compte</Link>
        </div>
        {!import.meta.env["VITE_API_URL"] && (
          <p className="mt-6 rounded-2xl border border-border/60 bg-secondary/30 p-3 text-[0.7rem] leading-relaxed text-muted-foreground">
            Les comptes de démonstration sont disponibles uniquement en mode local.
          </p>
        )}
      </div>
    </div>
  );
}
