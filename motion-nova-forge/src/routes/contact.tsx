import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/dash/Primitives";
import { contactService } from "@/services";
import { errorMessage } from "@/api/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact i-Motion Academy" },
      { name: "description", content: "Posez une question sur les certifications EMS, les sessions en studio, les prérequis ou la vérification de certificat." },
      { property: "og:title", content: "Contact i-Motion Academy" },
      { property: "og:description", content: "Posez une question sur les certifications EMS, les sessions en studio, les prérequis ou la vérification de certificat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const field = "h-11 w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 text-sm outline-none transition-colors focus:border-electric/50";

function ContactPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => contactService.create({ ...form, phone: form.phone || null }),
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <>
      <PageHeader eyebrow="Contact" title="Parlez à l'académie" description="Réservations de groupe, prérequis, vérification de certificat — nous répondons sous un jour ouvré." />
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-24 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Envoyer un message">
          {mutation.isSuccess ? (
            <p className="text-sm text-muted-foreground">Merci — votre demande a bien été reçue. Un coordinateur vous répondra rapidement.</p>
          ) : (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
            >
              <label className="text-xs text-muted-foreground">Prénom
                <input className={field} maxLength={80} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Nom
                <input className={field} maxLength={80} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Email
                <input type="email" className={field} maxLength={160} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground">Téléphone (optionnel)
                <input className={field} maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Objet
                <input className={field} maxLength={140} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </label>
              <label className="text-xs text-muted-foreground sm:col-span-2">Message
                <textarea className="min-h-32 w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm outline-none focus:border-electric/50" maxLength={1000} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </label>
              {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" variant="electric" disabled={mutation.isPending}>{mutation.isPending ? "Envoi…" : "Envoyer le message"}</Button>
              </div>
            </form>
          )}
        </Panel>
        <Panel title="Accueil de l'académie">
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-electric" /> hello@i-motion.academy</li>
            <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-electric" /> +216 20 114 200</li>
            <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-electric" /> Ennasr II · Tunis · Sousse</li>
          </ul>
        </Panel>
      </section>
    </>
  );
}
