import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { LegalLayout, LegalSection } from "@/components/fesa/LegalLayout";

const TITLE = "Mentions légales | FESA 2026";
const DESCRIPTION = "Mentions légales du site du FESA 2026, organisé par la PAAF.";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#0d3d21]">
      <SiteHeader />
      <LegalLayout title="Mentions légales" updated="11 août 2026">
        <LegalSection title="1. Éditeur du site">
          <p>
            Le site www.fesaforum.com est édité par la PAAF — Plateforme Africaine pour
            l'Autonomisation
            des Femmes et des Filles, organisatrice du Forum de l'Entrepreneuriat et de la
            Souveraineté Alimentaire (FESA 2026).
          </p>
          <ul>
            <li>Siège : Dakar, Sénégal</li>
            <li>Téléphone : +221 77 477 83 60</li>
            <li>E-mail : contact@fesaforum.com</li>
            <li>Site : www.paafs.org</li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Directeur de publication">
          <p>La publication du site est assurée par la présidence de la PAAF.</p>
        </LegalSection>

        <LegalSection title="3. Hébergement">
          <p>
            Le site est hébergé sur une infrastructure cloud tierce et s'appuie sur Supabase pour le
            stockage des données d'inscription. Les coordonnées de l'hébergeur peuvent être
            communiquées sur demande auprès de l'éditeur.
          </p>
        </LegalSection>

        <LegalSection title="4. Propriété intellectuelle">
          <p>
            L'ensemble des contenus présents sur ce site (textes, logos, visuels, mise en page) est
            la propriété de la PAAF ou de ses partenaires, sauf mention contraire, et est protégé
            par le droit de la propriété intellectuelle. Toute reproduction ou représentation,
            totale ou partielle, sans autorisation préalable est interdite.
          </p>
        </LegalSection>

        <LegalSection title="5. Liens hypertextes">
          <p>
            Le site peut contenir des liens vers des sites tiers (partenaires, prestataires de
            paiement). La PAAF n'exerce aucun contrôle sur ces sites et décline toute responsabilité
            quant à leur contenu.
          </p>
        </LegalSection>

        <LegalSection title="6. Droit applicable">
          <p>
            Le présent site et les présentes mentions légales sont soumis au droit sénégalais. En
            cas de litige, et à défaut de résolution amiable, les tribunaux compétents du Sénégal
            seront seuls saisis.
          </p>
        </LegalSection>
      </LegalLayout>
      <SiteFooter />
    </div>
  );
}
