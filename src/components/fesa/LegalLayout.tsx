import type { ReactNode } from "react";

/** Shared shell for the legal pages (mentions légales, confidentialité,
 * conditions d'inscription) — consistent typography and spacing for
 * long-form legal text. */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-[#7a8b81]">Dernière mise à jour : {updated}</p>
      <div className="mt-10 space-y-10">{children}</div>
      <p className="mt-14 rounded-2xl border border-[#e0d6c6] bg-white/60 p-5 text-sm leading-relaxed text-[#5a6b62]">
        Ce document est un modèle standard fourni à titre indicatif. Il est recommandé de le faire
        valider par un conseiller juridique avant publication définitive, notamment au regard du
        droit sénégalais et de la réglementation applicable aux paiements en ligne.
      </p>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#0d3d21]">{title}</h2>
      <div className="prose-legal mt-3 space-y-3 text-[15px] leading-relaxed text-[#42544a] [&_a]:text-[#0b7a3c] [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
