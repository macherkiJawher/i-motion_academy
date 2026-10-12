import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services";
import { errorMessage } from "@/api/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser votre mot de passe — i-Motion Academy" },
      {
        name: "description",
        content: "Demandez un lien de réinitialisation pour votre compte i-Motion Academy.",
      },
      { name: "referrer", content: "no-referrer" },
      { property: "og:title", content: "Réinitialiser votre mot de passe — i-Motion Academy" },
      {
        property: "og:description",
        content: "Demandez un lien de réinitialisation pour votre compte i-Motion Academy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-32">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-semibold">Mot de passe oublié</h1>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Si un compte existe pour cette adresse, un lien de réinitialisation sera envoyé.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                await authService.forgotPassword(email);
                setSent(true);
              } catch (requestError) {
                setError(errorMessage(requestError));
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block text-xs text-muted-foreground">
              Email
              <input
                type="email"
                required
                maxLength={160}
                className="h-11 w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 text-sm outline-none focus:border-electric/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" variant="electric" className="w-full" disabled={loading}>
              {loading ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          <Link to="/login" className="text-electric hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
