import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { BadgePreview } from "@/components/fesa/BadgePreview";
import { eventQuery, registrationQuery } from "@/lib/event";

const TITLE = "Inscription confirmée — FESA 2026";
const DESCRIPTION =
  "Votre inscription au FESA 2026 est confirmée. Votre badge nominatif vous est envoyé par e-mail et WhatsApp.";

export const Route = createFileRoute("/confirmation/$registrationId")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { registrationId } = Route.useParams();
  const { data: event } = useQuery(eventQuery);
  const { data: registration, isLoading } = useQuery(registrationQuery(registrationId));

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
              <CheckCircle2 className="size-4" /> Inscription enregistrée
            </span>
            <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Merci, votre place est réservée</h1>
            <p className="mt-3 text-muted-foreground">
              {isLoading
                ? "Chargement de votre inscription…"
                : registration
                  ? `${registration.full_name}, votre inscription au ${event?.name ?? "forum"} est confirmée.`
                  : "Inscription introuvable pour cet identifiant."}
            </p>

            <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Identifiant d'inscription
              </p>
              <p className="mt-1 font-mono text-xl font-bold">{registrationId}</p>
            </div>

            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                <Mail className="size-4 text-primary" />
                Badge en cours d'envoi par e-mail
                <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  En file d'attente
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                <MessageCircle className="size-4 text-accent" />
                Badge en cours d'envoi par WhatsApp
                <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  En file d'attente
                </span>
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="institutional" size="lg">
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </div>
          </div>

          <aside className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Votre badge</p>
            <BadgePreview
              data={{
                eventName: event?.name ?? "FESA 2026",
                eventDates: "21 – 22 septembre 2026",
                location: event?.location ?? "Dakar, Sénégal",
                fullName: registration?.full_name ?? "—",
                functionLabel: registration?.function,
                company: registration?.company,
                profileLabel: registration?.profile_label ?? "Participant",
                profileColor: registration?.profile_color ?? "#2E7D32",
                registrationId,
                qrValue: registration?.qr_payload,
              }}
            />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
