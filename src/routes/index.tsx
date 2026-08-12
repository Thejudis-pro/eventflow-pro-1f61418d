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
  Menu,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import heroPhoto from "@/assets/hero-fesa.jpeg";
import partnerLogos from "@/assets/fesa-partner-logos.png";
import partnerFlyer from "@/assets/fesa-partner-flyer.png";
import socialBanner from "@/assets/fesa-social-banner.png";
import logoAsset from "@/assets/fesa-logo.png.asset.json";
// No standalone PAAF mark has been provided yet (only the combined PAAF+FESA
// header band in header-fesa-band.jpeg) — add a cropped/isolated logo file
// under src/assets/ and set PAAF_LOGO_URL to it once available.
const PAAF_LOGO_URL: string | null = null;
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useReveal } from "@/components/fesa/Reveal";
import { eventQuery, subscribeToNewsletter } from "@/lib/event";
import { AXES, OBJECTIVES, PAAF_STATS } from "@/lib/forum-content";

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
      { property: "og:url", content: "https://fesa2026.com/" },
      { property: "og:image", content: `https://fesa2026.com${socialBanner}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://fesa2026.com${socialBanner}` },
    ],
    links: [{ rel: "canonical", href: "https://fesa2026.com/" }],
  }),
  component: Landing,
});

const ARROW = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M5 12h13M12 5l7 7-7 7" />
  </svg>
);

/** Deterministic decorative QR block, same generator as the source design. */
function QrMark({ seed = 184, dark = "#0d3d21" }: { seed?: number; dark?: string }) {
  const N = 21;
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c > N - 8) || (r > N - 8 && c < 7);
  const cells: React.ReactElement[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isFinder(r, c)) continue;
      if (rnd() > 0.52)
        cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={dark} />);
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`f${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill={dark} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fbf7f0" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill={dark} />
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${N} ${N}`}
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR du badge"
    >
      {cells}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

const NAV = [
  { label: "Le forum", href: "#forum" },
  { label: "À propos", to: "/a-propos" as const },
  { label: "Programme", href: "#programme" },
  { label: "Tarifs & stands", href: "#tarifs" },
  { label: "Partenaires", href: "#partenaires" },
];

const DAY_21 = [
  { t: "Cérémonie d'ouverture et discours officiels", s: "Plénière · toutes catégories" },
  { t: "Panel institutionnel de haut niveau", s: "CEDEAO, UEMOA, ministères, PTF" },
  { t: "Ateliers thématiques", s: "Sessions parallèles · sur inscription" },
];

const DAY_22 = [
  { t: "Ateliers thématiques", s: "Sessions parallèles · sur inscription" },
  { t: "Mentorat et mise en relation", s: "Rendez-vous B2B · sur créneaux" },
  { t: "Signature et clôture", s: "Engagements et feuille de route régionale" },
];

type Tier = {
  kicker: string;
  title: string[];
  price: string;
  note: string;
  cta: string;
  included: string[];
  highlight?: boolean;
  audience?: string;
};

const TIERS: Tier[] = [
  {
    kicker: "TICKET",
    title: ["Participant", "sénégalais"],
    price: "10 000",
    note: "Pour les deux journées",
    cta: "S'inscrire",
    included: [
      "Plénières et panels",
      "Ateliers thématiques",
      "Espace exposition",
      "Badge nominatif QR",
      "Attestation de participation",
    ],
  },
  {
    kicker: "TICKET",
    title: ["Participant", "non-sénégalais"],
    price: "20 000",
    note: "Délégations des 15 pays invités et autres",
    cta: "S'inscrire",
    included: [
      "Plénières et panels",
      "Ateliers thématiques",
      "Espace exposition",
      "Badge nominatif QR",
      "Attestation de participation",
    ],
  },
  {
    kicker: "MARCHÉ FORAIN",
    title: ["Stand exposant", "9 m²"],
    price: "200 000",
    note: "Emplacement pour les deux jours",
    cta: "Réserver un stand",
    included: [
      "Stand équipé avec mobilier de base (table + 2 chaises + panneau nom)",
      "2 badges gratuits",
      "Accès site du forum",
    ],
  },
  {
    kicker: "ESPACE INSTITUTIONNEL",
    title: ["Stand institutionnel", "12 m²"],
    price: "1 500 000",
    note: "Visibilité sur tous les supports",
    cta: "Réserver un stand institutionnel",
    highlight: true,
    included: ["Logo sur tous les supports", "3 badges gratuits", "Accès B2B"],
    audience:
      "Bailleurs · ONG · PME · Fondations · Entreprises nationales · Grandes institutions · Agences régionales · Ministères · Ambassades · Collectivités territoriales · PTF",
  },
];

const FOOTER_COLS = [
  {
    title: "LE FORUM",
    links: [
      { label: "À propos de la PAAF", href: "https://paafs.org", external: true },
      { label: "Objectifs", to: "/a-propos" as const },
      { label: "Axes thématiques", href: "#axes" },
      { label: "Programme", href: "#programme" },
    ],
  },
  {
    title: "PARTICIPER",
    links: [
      { label: "S'inscrire", to: "/inscription" as const },
      { label: "Réserver un stand", href: "#tarifs" },
    ],
  },
  {
    title: "PRATIQUE",
    links: [{ label: "Contact", href: "mailto:presidence@paafs.org" }],
  },
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
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const forumReveal = useReveal<HTMLDivElement>();
  const programmeReveal = useReveal<HTMLDivElement>();
  const tarifsReveal = useReveal<HTMLDivElement>();
  const partenairesReveal = useReveal<HTMLDivElement>();

  async function handleNewsletterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim();
    if (!email) return;
    setNewsletterStatus("submitting");
    try {
      await subscribeToNewsletter(event.id, email);
      setNewsletterStatus("success");
      form.reset();
    } catch (error) {
      console.error(error);
      setNewsletterStatus("error");
    }
  }

  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const diffDays = Math.ceil(
        (countdownTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      setDaysRemaining(Math.max(0, diffDays));
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [countdownTarget]);

  const eventJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: "FESA 2026 — Forum de l'Entrepreneuriat et de la Souveraineté Alimentaire",
      startDate: event?.start_date ?? "2026-09-21",
      endDate: event?.end_date ?? "2026-09-22",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: event?.location ?? "Dakar, Sénégal",
        address: { "@type": "PostalAddress", addressLocality: "Dakar", addressCountry: "SN" },
      },
      organizer: { "@type": "Organization", name: "PAAF", url: "https://www.paafs.org" },
      offers: TIERS.map((tier) => ({
        "@type": "Offer",
        name: tier.title.join(" "),
        price: tier.price.replace(/\s/g, ""),
        priceCurrency: "XOF",
        availability: "https://schema.org/InStock",
        url: "https://fesa2026.com/inscription",
      })),
    }),
    [event],
  );

  return (
    <div className="min-h-screen bg-[#fbf7f0] font-[Manrope,ui-sans-serif,system-ui] text-[#0d3d21]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      {/* Top bar */}
      <div className="bg-[#0d3d21] text-[rgba(251,247,240,.8)]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 py-2 text-[12px] font-medium sm:px-8 lg:h-10 lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:py-0 lg:px-16">
          <div className="flex flex-wrap items-center gap-x-[22px] gap-y-1">
            <span>
              Organisé par la PAAF — Plateforme Africaine pour l'Autonomisation des Femmes et des
              Filles
            </span>
            <span className="text-[#f0913f]">1ʳᵉ édition · Pays de la CEDEAO invités</span>
          </div>
          <div className="flex flex-wrap items-center gap-[18px]">
            <span>presidence@paafs.org</span>
            <span>+221 77 477 83 60</span>
            <span className="font-extrabold text-[#fbf7f0]">FR</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:h-[86px] lg:flex-nowrap lg:gap-10 lg:px-16 lg:py-0">
        <Link to="/" className="flex items-center gap-4">
          <img src={logoAsset.url} alt="FESA 2026" className="h-[42px] w-auto" />
          <span className="hidden h-8 w-px bg-[#ddd2c2] sm:block" />
          <span className="hidden max-w-[215px] text-[11.5px] font-bold leading-[1.35] text-[#5a6b62] sm:block">
            Forum de l'Entrepreneuriat et de la Souveraineté Alimentaire
          </span>
        </Link>
        <div className="flex items-center gap-[26px]">
          <nav className="hidden items-center gap-[26px] xl:flex">
            {NAV.map((n) =>
              "to" in n ? (
                <Link
                  key={n.label}
                  to={n.to}
                  className="text-[14px] font-semibold text-[#0d3d21] transition hover:text-[#e8722a]"
                >
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.label}
                  href={n.href}
                  className="text-[14px] font-semibold text-[#0d3d21] transition hover:text-[#e8722a]"
                >
                  {n.label}
                </a>
              ),
            )}
          </nav>
          <Link
            to="/inscription"
            className="hidden h-[46px] items-center gap-2 rounded-[14px] bg-[#e8722a] px-[22px] text-[14px] font-extrabold text-white transition hover:bg-[#c85c18] sm:flex"
          >
            S'inscrire
            {ARROW}
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Ouvrir le menu"
                className="flex size-[46px] items-center justify-center rounded-[14px] border border-[#ddd2c2] bg-white text-[#0d3d21] xl:hidden"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6">
              <nav className="mt-8 flex flex-col gap-1 text-base font-semibold text-[#0d3d21]">
                {NAV.map((n) => (
                  <SheetClose asChild key={n.label}>
                    {"to" in n ? (
                      <Link
                        to={n.to}
                        className="rounded-lg px-3 py-3 transition hover:bg-[#f8f4eb] hover:text-[#e8722a]"
                      >
                        {n.label}
                      </Link>
                    ) : (
                      <a
                        href={n.href}
                        className="rounded-lg px-3 py-3 transition hover:bg-[#f8f4eb] hover:text-[#e8722a]"
                      >
                        {n.label}
                      </a>
                    )}
                  </SheetClose>
                ))}
              </nav>
              <SheetClose asChild>
                <Link
                  to="/inscription"
                  className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-[#e8722a] px-[22px] text-[14px] font-extrabold text-white transition hover:bg-[#c85c18]"
                >
                  S'inscrire
                  {ARROW}
                </Link>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1440px] items-stretch lg:min-h-[600px] lg:grid-cols-[660px_minmax(0,1fr)]">
        <div className="relative z-[2] px-5 pb-14 pt-8 sm:px-8 lg:pb-[60px] lg:pl-16 lg:pr-14 lg:pt-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-[10px] rounded-full bg-[#e9f3ec] px-[14px] py-[7px] text-[12px] font-extrabold tracking-[.04em] text-[#0b7a3c]">
              <span className="size-[7px] rounded-full bg-[#e8722a]" />
              21 &amp; 22 SEPTEMBRE 2026 · DAKAR
            </span>
            <span className="rounded-full bg-[#0d3d21] px-[14px] py-[7px] text-[12px] font-extrabold tracking-[.04em] text-[#fbf7f0]">
              J − {daysRemaining}
            </span>
          </div>
          <h1 className="mt-6 text-[40px] font-extrabold leading-[1.02] tracking-[-.038em] text-[#0d3d21] sm:text-[52px] lg:text-[58px]">
            Forum de l'Entrepreneuriat et
            <br />
            <span className="text-[#0b7a3c]">de la Souveraineté Alimentaire</span>
          </h1>
          <p className="mt-5 max-w-[470px] border-l-[3px] border-[#e8722a] pl-4 text-[18px] font-semibold leading-[1.45] text-[#42544a]">
            Entrepreneuriat, économie sociale et solidaire et souveraineté alimentaire en Afrique de
            l'Ouest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/inscription"
              className="flex h-[58px] items-center gap-[10px] rounded-2xl bg-[#0b7a3c] px-7 text-[16px] font-extrabold text-white transition hover:bg-[#0d3d21]"
            >
              Je m'inscris
              {ARROW}
            </Link>
            <a
              href="#tarifs"
              className="flex h-[58px] items-center gap-[10px] rounded-2xl border border-[#ddd2c2] bg-white px-[26px] text-[16px] font-extrabold text-[#0d3d21] transition hover:bg-[#f4ece0]"
            >
              Réserver un stand
            </a>
          </div>
          <dl className="mt-11 flex max-w-[600px]">
            {[
              { v: "2", l: "jours" },
              { v: "15", l: "pays CEDEAO" },
              { v: "+2 000", l: "participants" },
              { v: "+21", l: "partenaires" },
            ].map((s, i) => (
              <div
                key={s.l}
                className={
                  i === 0 ? "flex-1 pr-5" : "flex-1 border-l border-[#e0d6c6] px-3 sm:px-5"
                }
              >
                <dt className="text-[24px] font-extrabold leading-none text-[#0d3d21] sm:text-[28px]">
                  {s.v}
                </dt>
                <dd className="mt-[6px] text-[11.5px] font-medium leading-[1.4] text-[#7a8b81]">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative min-h-[380px] lg:min-h-0">
          <img
            src={heroPhoto}
            alt="Productrice agricole utilisant une tablette"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute bottom-6 left-4 w-[290px] overflow-hidden rounded-[18px] bg-white shadow-[0_20px_44px_rgba(13,61,33,.22)] lg:bottom-14 lg:left-[-90px]">
            <div className="flex items-center justify-between bg-[#e8722a] px-4 py-3">
              <span className="text-[11px] font-extrabold tracking-[.08em] text-white">
                BADGE CONFIRMÉ
              </span>
              <span className="text-[11px] font-extrabold text-white">PAR-0184</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-[14px]">
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-extrabold leading-[1.2] text-[#0d3d21]">
                  Aïssatou Ndiaye
                </div>
                <div className="text-[11.5px] leading-[1.45] text-[#5a6b62]">
                  Coopérative Takku Ligey · Sénégal
                </div>
                <div className="mt-[9px] flex gap-[6px]">
                  <span className="rounded-full bg-[#e9f3ec] px-[9px] py-1 text-[10px] font-extrabold leading-[1.3] text-[#0b7a3c]">
                    Email ✓
                  </span>
                  <span className="rounded-full bg-[#e9f3ec] px-[9px] py-1 text-[10px] font-extrabold leading-[1.3] text-[#0b7a3c]">
                    WhatsApp ✓
                  </span>
                </div>
              </div>
              <div className="size-[66px] flex-none rounded-lg bg-[#fbf7f0] p-[5px]">
                <QrMark />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Le forum / objectifs */}
      <section
        id="forum"
        className="mx-auto max-w-[1440px] px-5 pt-16 sm:px-8 lg:px-16 lg:pt-[78px]"
      >
        <div
          ref={forumReveal.ref}
          className={`grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-16 ${forumReveal.className}`}
        >
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold tracking-[.12em] text-[#e8722a]">
              LE FORUM
            </div>
            <h2 className="mt-4 max-w-[640px] text-[36px] font-extrabold leading-[1.08] tracking-[-.035em] text-[#0d3d21] lg:text-[46px]">
              Formaliser,
              <br />
              financer,
              <br />
              <span className="text-[#0b7a3c]">transformer.</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-[16px] leading-[1.7] text-[#5a6b62]">
              1ʳᵉ édition, dédiée aux entreprises et coopératives, à l'ESS et à la souveraineté
              alimentaire ouest-africaine.
            </p>

            <div id="objectifs" className="mt-9 grid gap-x-9 sm:grid-cols-2 lg:grid-cols-3">
              {OBJECTIVES.map((o, i) => (
                <div
                  key={o}
                  className="flex gap-3 border-t border-[#e0d6c6] py-[14px] last:border-b sm:[&:nth-child(n+5)]:border-b lg:[&:nth-child(n+4)]:border-b"
                >
                  <span className="flex-none text-[12px] font-extrabold leading-[1.7] text-[#e8722a]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[14.5px] font-semibold leading-[1.5] text-[#42544a]">
                    {o}
                  </span>
                </div>
              ))}
            </div>

            <div id="axes" className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-7">
              <div className="w-20 flex-none text-[12px] font-extrabold leading-[2.6] tracking-[.12em] text-[#e8722a]">
                13 AXES
              </div>
              <div className="flex flex-wrap gap-2">
                {AXES.map((a) => (
                  <span
                    key={a}
                    className="rounded-[10px] bg-[#f2ede3] px-[13px] py-2 text-[13px] font-semibold text-[#42544a]"
                  >
                    {a}
                  </span>
                ))}
                <span className="rounded-[10px] bg-[#0b7a3c] px-[13px] py-2 text-[13px] font-semibold text-white">
                  ESS &amp; coopératives
                </span>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6">
            <div className="rounded-[20px] bg-[#0d3d21] p-[30px] text-[#fbf7f0]">
              {PAAF_LOGO_URL ? (
                <img src={PAAF_LOGO_URL} alt="Logo PAAF" className="mb-4 h-10 w-auto" />
              ) : (
                <div className="mb-4 flex h-10 w-32 items-center justify-center rounded-lg border border-dashed border-white/25 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  Logo PAAF
                </div>
              )}
              <div className="text-[12px] font-extrabold tracking-[.1em] text-[#f0913f]">
                PORTÉE PAR LA PAAF
              </div>
              <div className="mt-[22px] flex flex-col gap-5">
                {PAAF_STATS.map((s, i) => (
                  <div key={s.v} className="flex flex-col gap-5">
                    {i > 0 && <div className="h-px bg-[rgba(251,247,240,.14)]" />}
                    <div>
                      <div className="text-[30px] font-extrabold leading-none">{s.v}</div>
                      <div className="mt-[5px] text-[13px] font-medium leading-[1.5] text-[rgba(251,247,240,.68)]">
                        {s.l}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-[#e0d6c6] px-6 py-[22px]">
              <div className="text-[12px] font-extrabold tracking-[.1em] text-[#7a8b81]">
                DÉLÉGATIONS INVITÉES
              </div>
              <p className="mt-3 text-[13.5px] font-semibold leading-[1.9] text-[#42544a]">
                Bénin · Burkina Faso · Cabo Verde · Côte d'Ivoire · Gambie · Ghana · Guinée ·
                Guinée-Bissau · Libéria · Mali · Niger · Nigéria ·{" "}
                <span className="text-[#0b7a3c]">Sénégal (hôte)</span> · Sierra Leone · Togo
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Programme */}
      <section
        id="programme"
        className="mt-16 bg-[#0d3d21] py-14 text-[#fbf7f0] lg:mt-[78px] lg:py-[58px]"
      >
        <div
          ref={programmeReveal.ref}
          className={`mx-auto grid max-w-[1440px] items-start gap-10 px-5 sm:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14 lg:px-16 ${programmeReveal.className}`}
        >
          <div>
            <div className="text-[12px] font-extrabold tracking-[.12em] text-[#f0913f]">
              PROGRAMME
            </div>
            <h2 className="mt-[14px] text-[32px] font-extrabold leading-[1.12] tracking-[-.03em] text-[#fbf7f0] lg:text-[36px]">
              Deux jours,
              <br />à Dakar
            </h2>
            <p className="mt-4 text-[14.5px] leading-[1.7] text-[rgba(251,247,240,.68)]">
              Le détail des ateliers et des intervenants est publié progressivement. Les inscrits
              reçoivent chaque mise à jour par WhatsApp.
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-2">
            {[
              { n: "21", d: "LUNDI · SEPTEMBRE", items: DAY_21 },
              { n: "22", d: "MARDI · SEPTEMBRE", items: DAY_22 },
            ].map((day) => (
              <div key={day.n}>
                <div className="flex items-baseline gap-3 pb-[14px]">
                  <span className="text-[34px] font-extrabold leading-none text-[#e8722a]">
                    {day.n}
                  </span>
                  <span className="text-[12px] font-extrabold tracking-[.1em] text-[rgba(251,247,240,.6)]">
                    {day.d}
                  </span>
                </div>
                {day.items.map((it, i) => (
                  <div
                    key={it.t}
                    className={`border-t border-[rgba(251,247,240,.16)] py-[18px] ${
                      i === day.items.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <h3 className="text-[18px] font-extrabold leading-[1.3]">{it.t}</h3>
                    <div className="mt-1 text-[13px] leading-[1.5] text-[rgba(251,247,240,.6)]">
                      {it.s}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs & stands */}
      <section
        id="tarifs"
        className="mx-auto max-w-[1440px] px-5 pt-14 sm:px-8 lg:px-16 lg:pt-[70px]"
      >
        <div ref={tarifsReveal.ref} className={tarifsReveal.className}>
          <div className="grid items-end gap-8 border-b-[2.5px] border-[#0B7A3CEB] pb-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
            <div>
              <div className="text-[12px] font-extrabold tracking-[.12em] text-[#e8722a]">
                TARIFS &amp; STANDS
              </div>
              <h2 className="mt-[14px] text-[30px] font-extrabold leading-[1.1] tracking-[-.03em] text-[#0d3d21] lg:text-[38px]">
                Inscription en trois minutes,
                <br />
                depuis un téléphone
              </h2>
            </div>
            <div>
              <div className="text-[12px] font-bold tracking-[.1em] text-[#7a8b81]">
                MOYENS DE PAIEMENT
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-[10px] bg-[#1A8FE3] px-[15px] py-[9px] text-[12px] font-extrabold text-white">
                  Wave
                </span>
                <span className="rounded-[10px] bg-[#e8722a] px-[15px] py-[9px] text-[12px] font-extrabold text-white">
                  Orange Money
                </span>
                <span className="rounded-[10px] bg-[#0d3d21] px-[15px] py-[9px] text-[12px] font-extrabold text-white">
                  Carte bancaire
                </span>
                <span className="rounded-[10px] border border-[#ddd2c2] bg-white px-[15px] py-[9px] text-[12px] font-extrabold text-[#0d3d21]">
                  Virement
                </span>
              </div>
            </div>
          </div>

          <div className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {TIERS.map((tier, idx) => (
              <div
                key={tier.title.join(" ")}
                className={`flex flex-col ${
                  idx === 0 ? "lg:pr-7" : idx === TIERS.length - 1 ? "lg:pl-7" : "lg:px-7"
                } ${idx > 0 ? "lg:border-l lg:border-[#0b7a3c]/25" : ""}`}
              >
                <div className="text-[11.5px] font-extrabold tracking-[.1em] text-[#7a8b81]">
                  {tier.kicker}
                </div>
                <h3 className="mt-3 text-[26px] font-extrabold leading-[1.15] text-[#0d3d21]">
                  {tier.title[0]}
                  <br />
                  {tier.title[1]}
                </h3>
                <div className="mt-5 flex items-baseline gap-[6px]">
                  <span className="text-[38px] font-extrabold leading-none text-[#0d3d21]">
                    {tier.price}
                  </span>
                  <span className="text-[14px] font-bold text-[#7a8b81]">FCFA</span>
                </div>
                <div className="mt-2 text-[12.5px] font-medium leading-[1.5] text-[#7a8b81]">
                  {tier.note}
                </div>
                <Link
                  to="/inscription"
                  className="mt-[22px] flex h-12 items-center justify-center rounded-[14px] bg-[#0b7a3c] px-3 text-center text-[14px] font-extrabold text-white transition hover:bg-[#0d3d21]"
                >
                  {tier.cta}
                </Link>
                <div className="mt-[26px] flex flex-col gap-[11px]">
                  <div className="mb-[2px] text-[11.5px] font-extrabold tracking-[.08em] text-[#7a8b81]">
                    INCLUS
                  </div>
                  {tier.included.map((inc) => (
                    <div
                      key={inc}
                      className={`flex gap-[9px] text-[13.5px] leading-[1.45] ${
                        tier.highlight
                          ? "font-semibold text-[#0d3d21]"
                          : "font-medium text-[#42544a]"
                      }`}
                    >
                      <span
                        className={`font-extrabold ${
                          tier.highlight ? "text-[#e8722a]" : "text-[#0b7a3c]"
                        }`}
                      >
                        ✓
                      </span>
                      {inc}
                    </div>
                  ))}
                  {tier.audience && (
                    <>
                      <div className="mb-[2px] mt-[10px] text-[11.5px] font-extrabold tracking-[.08em] text-[#7a8b81]">
                        POUR QUI
                      </div>
                      <div className="text-[13px] font-medium leading-[1.75] text-[#42544a]">
                        {tier.audience}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partenaires */}
      <section
        id="partenaires"
        className="mx-auto max-w-[1440px] px-5 pt-16 sm:px-8 lg:px-16 lg:pt-[78px]"
      >
        <div
          ref={partenairesReveal.ref}
          className={`grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 ${partenairesReveal.className}`}
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-4">
              <div className="text-[12px] font-extrabold tracking-[.12em] text-[#e8722a]">
                ILS SOUTIENNENT LE FORUM
              </div>
              <div className="h-px flex-1 bg-[#e0d6c6]" />
            </div>
            <h2 className="mt-[14px] text-[28px] font-extrabold leading-[1.1] tracking-[-.03em] text-[#0d3d21] lg:text-[34px]">
              Plus de 21 partenaires
            </h2>
            <img
              src={partnerLogos}
              alt="Ministères, agences nationales et partenaires techniques et financiers du FESA 2026"
              loading="lazy"
              className="mt-6 block h-auto w-full max-w-[1104px]"
            />
          </div>
          <div className="rounded-[20px] bg-[#0d3d21] p-7 text-[#fbf7f0] lg:sticky lg:top-6">
            <div className="text-[12px] font-extrabold tracking-[.1em] text-[#f0913f]">
              PARTENARIAT
            </div>
            <h3 className="mt-[14px] text-[22px] font-extrabold leading-[1.2]">
              Devenez partenaire du FESA 2026
            </h3>
            <p className="mb-5 mt-3 text-[13.5px] leading-[1.7] text-[rgba(251,247,240,.72)]">
              Visibilité, mise en réseau et accès à un écosystème sous-régional de coopératives, PME
              et décideurs. Contactez notre secrétariat technique.
            </p>
            <div className="flex flex-col gap-2 text-[13.5px] font-bold leading-[1.5] text-[#f0913f]">
              <span>+221 77 477 83 60</span>
              <span>presidence@paafs.org</span>
              <span>www.paafs.org</span>
            </div>
            <a
              href="mailto:presidence@paafs.org?subject=Devenir%20partenaire%20du%20FESA%202026"
              className="mt-5 flex h-12 items-center justify-center rounded-[14px] bg-[#e8722a] text-[14px] font-extrabold text-white transition hover:bg-[#c85c18]"
            >
              Contactez-nous
            </a>
            <a
              href={partnerFlyer}
              download="FESA-2026-Brochure-Partenariat.png"
              className="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-[14px] border border-white/15 bg-white/10 text-[13px] font-bold text-[#fbf7f0] transition hover:bg-white/20"
            >
              Télécharger la brochure partenaire
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-[1440px] px-5 sm:px-8 lg:mt-[78px] lg:px-16">
        <div className="flex flex-col justify-between gap-10 rounded-3xl bg-[#e8722a] p-8 sm:flex-row sm:items-center lg:p-11">
          <div>
            <h2 className="text-[28px] font-extrabold leading-[1.12] tracking-[-.03em] text-white lg:text-[34px]">
              Les places de la 1ʳᵉ édition
              <br />
              partent vite.
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-[1.6] text-[rgba(255,255,255,.9)]">
              21 &amp; 22 septembre 2026 · Dakar, Sénégal
            </p>
          </div>
          <div className="flex flex-none flex-wrap gap-3">
            <Link
              to="/inscription"
              className="flex h-[58px] items-center rounded-2xl bg-[#0d3d21] px-[30px] text-[16px] font-extrabold text-white transition hover:bg-[#062713]"
            >
              Je m'inscris
            </Link>
            <a
              href="#tarifs"
              className="flex h-[58px] items-center rounded-2xl bg-[rgba(255,255,255,.18)] px-[26px] text-[16px] font-extrabold text-white transition hover:bg-[rgba(255,255,255,.32)]"
            >
              Réserver un stand
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 bg-[#0d3d21] pb-8 pt-12 text-[rgba(251,247,240,.72)] lg:mt-[70px] lg:pt-[52px]">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-16">
          <div className="grid gap-10 border-b border-[rgba(251,247,240,.14)] pb-10 sm:grid-cols-2 lg:grid-cols-[320px_repeat(3,minmax(0,1fr))_300px]">
            <div>
              <img src={logoAsset.url} alt="FESA 2026" className="h-[38px] w-auto" />
              <p className="mt-4 text-[13.5px] leading-[1.7] text-[rgba(251,247,240,.62)]">
                Forum Sous-régional de l'Entrepreneuriat Productif, organisé par la PAAF —
                Plateforme Africaine pour l'Autonomisation des Femmes et des Filles.
              </p>
            </div>
            {FOOTER_COLS.map((col) => (
              <div key={col.title} className="flex flex-col gap-[11px]">
                <div className="mb-1 text-[12px] font-extrabold tracking-[.1em] text-[#fbf7f0]">
                  {col.title}
                </div>
                {col.links.map((l) =>
                  "to" in l ? (
                    <Link
                      key={l.label}
                      to={l.to}
                      className="text-[13.5px] font-medium text-[rgba(251,247,240,.72)] transition hover:text-[#f0913f]"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      {...("external" in l && l.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-[13.5px] font-medium text-[rgba(251,247,240,.72)] transition hover:text-[#f0913f]"
                    >
                      {l.label}
                    </a>
                  ),
                )}
              </div>
            ))}
            <div>
              <div className="text-[12px] font-extrabold tracking-[.1em] text-[#fbf7f0]">
                RESTER INFORMÉ
              </div>
              <p className="mb-[14px] mt-3 text-[13.5px] leading-[1.6] text-[rgba(251,247,240,.62)]">
                Programme, intervenants, logistique — une lettre par mois.
              </p>
              <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Votre email"
                  aria-label="Votre email"
                  disabled={newsletterStatus === "submitting"}
                  className="h-12 min-w-0 flex-1 rounded-[14px] bg-[rgba(251,247,240,.1)] px-[14px] text-[13.5px] font-medium text-[#fbf7f0] outline-none placeholder:text-[rgba(251,247,240,.45)] disabled:opacity-60"
                />
                <button
                  type="submit"
                  aria-label="S'abonner"
                  disabled={newsletterStatus === "submitting"}
                  className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-[#e8722a] text-white disabled:opacity-60"
                >
                  {ARROW}
                </button>
              </form>
              {newsletterStatus === "success" && (
                <p className="mt-2 text-[12.5px] font-semibold text-[#7fd4a0]">
                  Merci, vous êtes inscrit·e.
                </p>
              )}
              {newsletterStatus === "error" && (
                <p className="mt-2 text-[12.5px] font-semibold text-[#f0913f]">
                  Une erreur est survenue. Réessayez.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-[22px] text-[12px] font-medium text-[rgba(251,247,240,.5)] sm:flex-row sm:justify-between">
            <span>© 2026 PAAF — www.paafs.org</span>
            <span className="flex flex-wrap gap-[22px]">
              <Link
                to="/mentions-legales"
                className="text-[rgba(251,247,240,.5)] hover:text-[#f0913f]"
              >
                Mentions légales
              </Link>
              <Link
                to="/confidentialite"
                className="text-[rgba(251,247,240,.5)] hover:text-[#f0913f]"
              >
                Confidentialité
              </Link>
              <Link
                to="/conditions-inscription"
                className="text-[rgba(251,247,240,.5)] hover:text-[#f0913f]"
              >
                Conditions d'inscription
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
