import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Handshake,
  Landmark,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  { value: "2", label: "jours" },
  { value: "15", label: "pays CEDEAO" },
  { value: "+2 000", label: "participants" },
  { value: "+21", label: "partenaires" },
];

const GOALS = [
  {
    title: "Formaliser",
    text: "Structurer les coopératives, PME et initiatives locales autour d'outils de gouvernance, qualité et traçabilité.",
  },
  {
    title: "Financer",
    text: "Créer des passerelles concrètes entre projets, institutions financières et investisseurs régionaux.",
  },
  {
    title: "Transformer",
    text: "Faire émerger de nouveaux modèles de production, d'industrialisation et d'inclusion économique.",
  },
  {
    title: "Rassembler",
    text: "Mettre en réseau les acteurs publics, privés et associatifs autour d'un agenda régional commun.",
  },
];

const THEMES = [
  "Femmes & jeunes",
  "Formalisation",
  "Financement",
  "Climat",
  "Agroalimentaire",
  "ZLECAf",
  "Numérique",
  "Industrialisation",
  "Emploi des jeunes",
  "Leadership féminin",
  "PPP",
  "Investissements agricoles",
  "ESS & coopératives",
];

const COUNTRIES = [
  "Bénin",
  "Burkina Faso",
  "Cabo Verde",
  "Côte d'Ivoire",
  "Gambie",
  "Ghana",
  "Guinée",
  "Guinée-Bissau",
  "Libéria",
  "Mali",
  "Niger",
  "Nigéria",
  "Sénégal (hôte)",
  "Sierra Leone",
  "Togo",
];

const PROGRAM = [
  {
    day: "21",
    label: "Lundi · septembre",
    items: [
      "Cérémonie d'ouverture et discours officiels",
      "Panel institutionnel de haut niveau",
      "Ateliers thématiques et sessions parallèles",
    ],
  },
  {
    day: "22",
    label: "Mardi · septembre",
    items: [
      "Ateliers thématiques",
      "Mentorat et mise en relation",
      "Signature, engagements et clôture",
    ],
  },
];

const TICKETS = [
  {
    title: "Participant sénégalais",
    price: "10 000 FCFA",
    blurb: "Pour les deux journées",
    perks: ["Plénières et panels", "Ateliers thématiques", "Espace exposition", "Badge nominatif QR", "Attestation de participation"],
    cta: "S'inscrire",
    accent: "bg-[#fdf8ef] text-[#0d3d21]",
  },
  {
    title: "Participant non-sénégalais",
    price: "20 000 FCFA",
    blurb: "Délégations des 15 pays invités et autres",
    perks: ["Plénières et panels", "Ateliers thématiques", "Espace exposition", "Badge nominatif QR", "Attestation de participation"],
    cta: "S'inscrire",
    accent: "bg-[#0d3d21] text-[#fdf8ef]",
  },
  {
    title: "Marché Forain",
    price: "200 000 FCFA",
    blurb: "Stand exposant · 9 m²",
    perks: ["Stand équipé avec mobilier de base", "2 badges gratuits", "Accès site du forum"],
    cta: "Réserver un stand",
    accent: "border-[#e8722a]/40 bg-[#fff6ed] text-[#0d3d21]",
  },
  {
    title: "Espace institutionnel",
    price: "1 500 000 FCFA",
    blurb: "Stand institutionnel · 12 m²",
    perks: ["Logo sur tous les supports", "3 badges gratuits", "Accès B2B"],
    cta: "Réserver un stand institutionnel",
    accent: "border-[#e8722a]/40 bg-[#fff6ed] text-[#0d3d21]",
  },
];

const PARTNERS = [
  "Banque mondiale",
  "CEDEAO",
  "UEMOA",
  "PNUD",
  "GIZ",
  "FAO",
  "BAD",
  "ONU Femmes",
];

function Landing() {
  const { data: event } = useQuery(eventQuery);

  const countdownTarget = useMemo(() => {
    if (event?.start_date) {
      return new Date(`${event.start_date}T00:00:00`);
    }

    return new Date("2026-09-21T00:00:00");
  }, [event?.start_date]);

  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const diffDays = Math.ceil((countdownTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setDaysRemaining(Math.max(0, diffDays));
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [countdownTarget]);

  return (
    <div className="min-h-screen bg-[#f8f4eb] text-[#183b24]">
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden bg-[#0d3d21] text-[#fdf8ef]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(232,114,42,0.2),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_40%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="max-w-3xl">
                <p className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#ffd8b5]">
                  Organisé par la PAAF · 1ʳᵉ édition
                </p>
                <h1 className="mt-6 text-4xl font-black leading-[0.95] sm:text-5xl lg:text-7xl">
                  Forum de l'Entrepreneuriat et de la Souveraineté Alimentaire
                </h1>
                <p className="mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
                  Entrepreneuriat, économie sociale et solidaire et souveraineté alimentaire en Afrique de l'Ouest.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild variant="hero" size="xl">
                    <Link to="/inscription">
                      Je m'inscris <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="xl" className="border border-white/20 bg-white/10 text-[#fdf8ef] hover:bg-white/20">
                    <a href="#tarifs">Réserver un stand</a>
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                    <CalendarDays className="size-4" /> 21 & 22 septembre 2026
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                    <MapPin className="size-4" /> {event?.location ?? "Dakar, Sénégal"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                    <Clock3 className="size-4" /> J - {daysRemaining}
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 rounded-[2rem] bg-[#e8722a] opacity-20 blur-3xl" />
                <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
                  <div className="rounded-[1.5rem] bg-[#fdf8ef] p-6 text-[#0d3d21]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e8722a]">
                          Badge confirmé
                        </p>
                        <p className="mt-2 text-2xl font-black">PAR-0184</p>
                      </div>
                      <span className="rounded-full bg-[#0d3d21] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#fdf8ef]">
                        {event?.name ?? "FESA 2026"}
                      </span>
                    </div>
                    <div className="mt-6 rounded-[1.25rem] border border-[#0d3d21]/10 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-full bg-[#0d3d21] text-lg font-black text-[#fdf8ef]">
                          A
                        </div>
                        <div>
                          <p className="font-semibold">Aïssatou Ndiaye</p>
                          <p className="text-sm text-[#3d5a45]">Coopérative Takku Ligey · Sénégal</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-2 text-sm text-[#3d5a45]">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="size-4 text-[#0d3d21]" /> Email confirmé
                        </div>
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="size-4 text-[#0d3d21]" /> WhatsApp confirmé
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#dcd2bd] bg-[#fbf5eb]">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {STATS.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#e3dccf] bg-white/70 p-5 shadow-sm">
                <p className="font-display text-4xl font-black text-[#0d3d21]">{item.value}</p>
                <p className="mt-1 text-sm uppercase tracking-[0.2em] text-[#5f6f5f]">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="forum" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e8722a]">Le forum</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Formaliser, financer, transformer.</h2>
              <p className="mt-5 max-w-xl text-lg text-[#4f5f51]">
                La 1ʳᵉ édition du FESA rassemble les entreprises, coopératives, institutions et partenaires autour d'un agenda commun dédié à la souveraineté alimentaire et à la transition économique en Afrique de l'Ouest.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {GOALS.map((goal) => (
                <article key={goal.title} className="rounded-2xl border border-[#e3dccf] bg-white p-6 shadow-sm">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#0d3d21]/10 text-[#0d3d21]">
                    <Sparkles className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#0d3d21]">{goal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f6f5f]">{goal.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="objectifs" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="rounded-[2rem] border border-[#e3dccf] bg-[#f8f4eb] p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e8722a]">Objectifs</p>
                <h2 className="mt-3 text-3xl font-black text-[#0d3d21]">Un agenda régional pluriannuel</h2>
                <p className="mt-4 text-lg text-[#4f5f51]">
                  Le FESA pose les bases d'une dynamique durable entre femmes entrepreneures, coopératives, institutions régionales et financeurs.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    "Accès au financement CEDEAO / UEMOA",
                    "Passerelles projets ↔ investisseurs",
                    "Initiatives des femmes et des jeunes",
                    "ESS et gouvernance coopérative",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl border border-[#e3dccf] bg-white px-4 py-3">
                      <ShieldCheck className="mt-0.5 size-5 text-[#0d3d21]" />
                      <span className="text-sm font-medium text-[#27482f]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="rounded-[2rem] border border-[#e3dccf] bg-[#0d3d21] p-8 text-[#fdf8ef]">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ffd8b5]">13 axes</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {THEMES.map((theme) => (
                      <span key={theme} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#e3dccf] bg-white p-6 shadow-sm">
                    <p className="font-display text-3xl font-black text-[#0d3d21]">+21 000</p>
                    <p className="mt-2 text-sm text-[#5f6f5f]">femmes rurales structurées en coopératives</p>
                  </div>
                  <div className="rounded-2xl border border-[#e3dccf] bg-white p-6 shadow-sm">
                    <p className="font-display text-3xl font-black text-[#0d3d21]">7</p>
                    <p className="mt-2 text-sm text-[#5f6f5f]">pays d'intervention en Afrique de l'Ouest</p>
                  </div>
                  <div className="rounded-2xl border border-[#e3dccf] bg-white p-6 shadow-sm">
                    <p className="font-display text-3xl font-black text-[#0d3d21]">2019</p>
                    <p className="mt-2 text-sm text-[#5f6f5f]">accompagnement continu depuis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="partenaires" className="bg-[#f8f4eb] py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="rounded-[2rem] border border-[#e3dccf] bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e8722a]">Délégations invitées</p>
                  <h2 className="mt-3 text-3xl font-black text-[#0d3d21]">Les 15 pays de la CEDEAO et leurs partenaires</h2>
                  <p className="mt-4 text-lg text-[#4f5f51]">
                    Le forum ouvre un espace d'échange à destination des délégations, institutions, entreprises et organisations de la sous-région.
                  </p>
                </div>
                <div className="rounded-full border border-[#e3dccf] bg-[#f8f4eb] px-4 py-2 text-sm font-medium text-[#27482f]">
                  21+ partenaires engagés
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {COUNTRIES.map((country) => (
                  <span key={country} className="rounded-full border border-[#e3dccf] bg-[#fbf5eb] px-3 py-2 text-sm text-[#27482f]">
                    {country}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="programme" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e8722a]">Programme</p>
              <h2 className="mt-3 text-3xl font-black text-[#0d3d21]">Deux jours à Dakar</h2>
              <p className="mt-4 text-lg text-[#4f5f51]">
                Le détail des ateliers et des intervenants est publié progressivement. Les inscrits reçoivent chaque mise à jour par WhatsApp.
              </p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {PROGRAM.map((day) => (
                <div key={day.day} className="rounded-[2rem] border border-[#e3dccf] bg-[#f8f4eb] p-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-[#0d3d21] text-2xl font-black text-[#fdf8ef]">
                      {day.day}
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e8722a]">{day.label}</p>
                      <p className="text-lg font-semibold text-[#0d3d21]">{day.day === "21" ? "Lundi · septembre" : "Mardi · septembre"}</p>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {day.items.map((item) => (
                      <li key={item} className="flex gap-3 rounded-xl border border-[#e3dccf] bg-white px-4 py-3 text-sm text-[#4f5f51]">
                        <Check className="mt-0.5 size-4 text-[#0d3d21]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tarifs" className="bg-[#f8f4eb] py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e8722a]">Tarifs & stands</p>
              <h2 className="mt-3 text-3xl font-black text-[#0d3d21]">Inscription en trois minutes depuis un téléphone</h2>
              <p className="mt-4 text-lg text-[#4f5f51]">
                Plusieurs formules sont disponibles selon votre profil, votre délégation et votre niveau d'exposition.
              </p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {TICKETS.map((ticket) => (
                <article key={ticket.title} className={`rounded-[2rem] border border-[#e3dccf] p-8 shadow-sm ${ticket.accent}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{ticket.title}</h3>
                      <p className="mt-2 text-sm opacity-80">{ticket.blurb}</p>
                    </div>
                    <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{ticket.price}</div>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm">
                    {ticket.perks.map((perk) => (
                      <li key={perk} className="flex gap-3">
                        <Check className="size-4 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={ticket.title.includes("Stand") ? "institutional" : "hero"} className="mt-8">
                    <Link to="/inscription">{ticket.cta}</Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="rounded-[2rem] border border-[#e3dccf] bg-[#0d3d21] p-8 text-[#fdf8ef] shadow-sm">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ffd8b5]">Partenariat</p>
                  <h2 className="mt-3 text-3xl font-black">Devenez partenaire du FESA 2026</h2>
                  <p className="mt-4 max-w-2xl text-lg text-white/80">
                    Visibilité, mise en réseau et accès à un écosystème sous-régional de coopératives, PME et décideurs.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-6">
                  <div className="flex flex-wrap gap-3">
                    {PARTNERS.map((partner) => (
                      <span key={partner} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-[#fdf8ef]">
                        {partner}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/80">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                      <Building2 className="size-4" /> +21 partenaires
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                      <Handshake className="size-4" /> Visibilité régionale
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                      <Landmark className="size-4" /> Institutions & financeurs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f8f4eb] py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="rounded-[2rem] border border-[#e3dccf] bg-white p-8 shadow-sm">
              <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#e8722a]">Rester informé</p>
                  <h2 className="mt-3 text-3xl font-black text-[#0d3d21]">Les places de la 1ʳᵉ édition partent vite</h2>
                  <p className="mt-4 text-lg text-[#4f5f51]">
                    Recevez le programme, les intervenants et les dernières infos de logistique directement dans votre boîte mail.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="hero" size="lg">
                    <Link to="/inscription">Je m'inscris</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href="#forum">Découvrir le forum</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
