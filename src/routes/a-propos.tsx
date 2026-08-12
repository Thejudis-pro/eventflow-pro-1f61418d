import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Landmark, Sparkles, Target } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { useReveal } from "@/components/fesa/Reveal";
import {
  AXES,
  FORUM_INTRO,
  FORUM_TAGLINE,
  INVITED_DELEGATIONS,
  OBJECTIVES,
  PAAF_STATS,
} from "@/lib/forum-content";

const TITLE = "À propos du FESA 2026 | Dakar, 21-22 septembre 2026";
const DESCRIPTION =
  "Le FESA 2026 : qu'est-ce que le forum, ses objectifs, ses axes thématiques et la PAAF, l'organisation qui le porte.";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fesa2026.vercel.app/a-propos" },
    ],
    links: [{ rel: "canonical", href: "https://fesa2026.vercel.app/a-propos" }],
  }),
  component: AProposPage,
});

function AProposPage() {
  const objectivesReveal = useReveal<HTMLElement>();
  const axesReveal = useReveal<HTMLElement>();
  const paafReveal = useReveal<HTMLElement>();

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#0d3d21]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#e9f3ec] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0b7a3c]">
          <Sparkles className="size-3.5" /> À propos
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Qu'est-ce que le FESA 2026 ?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#42544a]">{FORUM_TAGLINE}</p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#5a6b62]">{FORUM_INTRO}</p>

        <section ref={objectivesReveal.ref} className={`mt-14 ${objectivesReveal.className}`}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#0d3d21]/10 text-[#0d3d21]">
              <Target className="size-5" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Objectifs</h2>
          </div>
          <div className="mt-6 grid gap-x-9 sm:grid-cols-2">
            {OBJECTIVES.map((o, i) => (
              <div
                key={o}
                className="flex gap-3 border-t border-[#e0d6c6] py-[14px] last:border-b sm:[&:nth-child(n+5)]:border-b"
              >
                <span className="flex-none text-[12px] font-extrabold leading-[1.7] text-[#a8481a]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14.5px] font-semibold leading-[1.5] text-[#42544a]">
                  {o}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section ref={axesReveal.ref} className={`mt-14 ${axesReveal.className}`}>
          <h2 className="text-2xl font-extrabold tracking-tight">13 axes thématiques</h2>
          <div className="mt-6 flex flex-wrap gap-2">
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
        </section>

        <section
          ref={paafReveal.ref}
          className={`mt-14 grid gap-8 lg:grid-cols-2 ${paafReveal.className}`}
        >
          <div className="rounded-[20px] bg-[#0d3d21] p-[30px] text-[#fbf7f0]">
            <div className="flex items-center gap-2 text-[12px] font-extrabold tracking-[.1em] text-[#f0913f]">
              <Landmark className="size-4" /> PORTÉE PAR LA PAAF
            </div>
            <p className="mt-3 text-[13.5px] leading-[1.7] text-white/70">
              Le FESA 2026 est organisé par la PAAF — Plateforme Africaine pour l'Autonomisation des
              Femmes et des Filles.{" "}
              <a
                href="https://paafs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#f0913f] underline-offset-2 hover:underline"
              >
                En savoir plus sur la PAAF ↗
              </a>
            </p>
            <div className="mt-6 flex flex-col gap-5">
              {PAAF_STATS.map((s, i) => (
                <div key={s.v} className="flex flex-col gap-5">
                  {i > 0 && <div className="h-px bg-white/10" />}
                  <div>
                    <div className="text-[26px] font-extrabold leading-none">{s.v}</div>
                    <div className="mt-[5px] text-[13px] font-medium leading-[1.5] text-white/60">
                      {s.l}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e0d6c6] px-6 py-[26px]">
            <div className="text-[12px] font-extrabold tracking-[.1em] text-[#7a8b81]">
              DÉLÉGATIONS INVITÉES
            </div>
            <p className="mt-3 text-[13.5px] font-semibold leading-[1.9] text-[#42544a]">
              {INVITED_DELEGATIONS.map((d, i) => (
                <span key={d}>
                  {i > 0 && " · "}
                  <span className={d.includes("hôte") ? "text-[#0b7a3c]" : undefined}>{d}</span>
                </span>
              ))}
            </p>
          </div>
        </section>

        <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-[#a8481a] p-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-extrabold leading-tight text-white">
            Prêt·e à rejoindre le forum ?
          </h2>
          <Link
            to="/inscription"
            className="flex h-[52px] items-center gap-2 rounded-2xl bg-[#0d3d21] px-7 text-[15px] font-extrabold text-white transition hover:bg-[#062713]"
          >
            Je m'inscris
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
