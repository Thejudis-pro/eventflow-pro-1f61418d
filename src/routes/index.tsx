import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, ArrowRight, Sprout, Factory, Coins, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { eventQuery } from "@/lib/event";

const TITLE = "FESA 2026 — Forum entrepreneuriat & souveraineté alimentaire | Dakar";
const DESCRIPTION =
  "FESA 2026, organisé par la PAAF à Dakar les 21 et 22 septembre 2026 : 2 jours, 15 pays CEDEAO, 2000+ participants. Inscrivez-vous en ligne.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Landing,
});

const STATS = [
  { value: "2", label: "jours de forum" },
  { value: "15", label: "pays CEDEAO" },
  { value: "2000+", label: "participants attendus" },
  { value: "21+", label: "partenaires" },
];

const THEMES = [
  {
    icon: Sprout,
    title: "Souveraineté alimentaire",
    text: "Chaînes de valeur locales, sécurisation des semences et résilience des systèmes agricoles.",
  },
  {
    icon: Factory,
    title: "Agro-transformation",
    text: "Industrialisation légère, normes qualité et accès aux marchés régionaux de la CEDEAO.",
  },
  {
    icon: Coins,
    title: "Financement & investissement",
    text: "Banques, fonds et institutions face aux besoins des PME dirigées par des femmes.",
  },
  {
    icon: Users,
    title: "Autonomisation des femmes",
    text: "Leadership économique, formation et accompagnement des entrepreneures et des jeunes filles.",
  },
];

const PROGRAM = [
  {
    day: "Lundi 21 septembre",
    items: [
      ["08h30", "Accueil, enregistrement et remise des badges"],
      ["10h00", "Cérémonie d'ouverture officielle — allocutions institutionnelles"],
      ["11h30", "Panel 1 : Souveraineté alimentaire en Afrique de l'Ouest"],
      ["14h30", "Ateliers sectoriels : agro-transformation, logistique, commerce"],
      ["17h00", "Village des exposants & networking"],
    ],
  },
  {
    day: "Mardi 22 septembre",
    items: [
      ["09h00", "Panel 2 : Financer les PME dirigées par des femmes"],
      ["11h00", "Rendez-vous B2B investisseurs / entrepreneurs"],
      ["14h00", "Signature de conventions et engagements partenaires"],
      ["16h00", "Restitution, recommandations et clôture"],
    ],
  },
];

const PARTNERS = [
  "Ministère de l'Agriculture",
  "Ministère de la Femme",
  "GIZ",
  "BOAD",
  "CEDEAO",
  "BAD",
  "PNUD",
  "ONU Femmes",
  "Chambre de Commerce",
  "FAO",
  "Banque Atlantique",
  "ADEPME",
];

function Landing() {
  const { data: event } = useQuery(eventQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
            <div>
              <p className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                Organisé par la PAAF
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-6xl">
                {event?.name ?? "FESA 2026"}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-primary-foreground/85">
                Forum de l'Entrepreneuriat et de la Souveraineté Alimentaire — deux journées de
                dialogue entre États, institutions financières, partenaires techniques et
                entrepreneures d'Afrique de l'Ouest.
              </p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" /> 21 – 22 septembre 2026
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4" /> {event?.location ?? "Dakar, Sénégal"}
                </span>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="xl">
                  <Link to="/inscription">
                    Je m'inscris <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="onHero" size="xl">
                  <a href="#programme">Voir le programme</a>
                </Button>
              </div>
            </div>

            <div className="hidden items-center justify-center lg:flex">
              <div className="relative aspect-square w-full max-w-sm">
                <div className="absolute inset-0 rounded-[2rem] border border-primary-foreground/25" />
                <div className="absolute inset-6 rounded-[1.5rem] bg-primary-foreground/10 backdrop-blur" />
                <div className="absolute inset-x-12 top-16 space-y-4">
                  {STATS.slice(0, 3).map((s) => (
                    <div
                      key={s.label}
                      className="flex items-baseline justify-between border-b border-primary-foreground/20 pb-3"
                    >
                      <span className="font-display text-4xl font-bold">{s.value}</span>
                      <span className="text-xs uppercase tracking-widest opacity-80">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-4xl font-bold text-primary-deep sm:text-5xl">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">Axes thématiques</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Quatre chantiers structurants pour bâtir une économie alimentaire souveraine et
            inclusive en Afrique de l'Ouest.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {THEMES.map((t) => (
              <article
                key={t.title}
                className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-lift"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <t.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="programme" className="bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold sm:text-4xl">Programme indicatif</h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {PROGRAM.map((d) => (
                <div
                  key={d.day}
                  className="rounded-xl border border-border bg-card p-6 shadow-card"
                >
                  <h3 className="text-lg font-semibold text-primary-deep">{d.day}</h3>
                  <ul className="mt-4 space-y-4">
                    {d.items.map(([time, label]) => (
                      <li
                        key={time}
                        className="flex gap-4 border-b border-border pb-3 last:border-0"
                      >
                        <span className="w-14 shrink-0 font-mono text-sm font-semibold text-accent">
                          {time}
                        </span>
                        <span className="text-sm text-foreground">{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">Partenaires & institutions</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PARTNERS.map((p) => (
              <div
                key={p}
                className="flex h-20 items-center justify-center rounded-lg border border-border bg-card px-4 text-center text-sm font-medium text-muted-foreground"
              >
                {p}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-primary-deep py-16 text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Réservez votre place</h2>
              <p className="mt-2 text-primary-foreground/80">
                Inscription en ligne, badge nominatif envoyé par e-mail et WhatsApp.
              </p>
            </div>
            <Button asChild variant="hero" size="xl">
              <Link to="/inscription">
                Commencer l'inscription <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
