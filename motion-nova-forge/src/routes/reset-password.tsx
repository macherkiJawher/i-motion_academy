import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { authService } from "@/services";
import { errorMessage } from "@/api/client";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Définir un nouveau mot de passe — i-Motion Academy" },
      {
        name: "description",
        content: "Choisissez un nouveau mot de passe pour votre compte i-Motion Academy.",
      },
      { name: "referrer", content: "no-referrer" },
      { property: "og:title", content: "Définir un nouveau mot de passe — i-Motion Academy" },
      {
        property: "og:description",
        content: "Choisissez un nouveau mot de passe pour votre compte i-Motion Academy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-32">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-semibold">Nouveau mot de passe</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password.length < 8)
              return setError("Le mot de passe doit contenir au moins 8 caractères.");
            if (new TextEncoder().encode(password).length > 72)
              return setError("Le mot de passe ne peut pas dépasser 72 octets UTF-8.");
            setError(null);
            setLoading(true);
            try {
              await authService.resetPassword(token ?? "", password);
              navigate({ to: "/login", replace: true });
            } catch (resetError) {
              setError(errorMessage(resetError));
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="block text-xs text-muted-foreground">
            Mot de passe
            <input
              type="password"
              required
              maxLength={72}
              className="h-11 w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 text-sm outline-none focus:border-electric/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" variant="electric" className="w-full" disabled={loading}>
            {loading ? "Enregistrement…" : "Mettre à jour"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">
          <Link to="/login" className="text-electric hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
