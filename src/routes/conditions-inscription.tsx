import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { LegalLayout, LegalSection } from "@/components/fesa/LegalLayout";

const TITLE = "Conditions d'inscription | FESA 2026";
const DESCRIPTION =
  "Conditions générales d'inscription et de participation au Forum de l'Entrepreneuriat et de la Souveraineté Alimentaire 2026.";

export const Route = createFileRoute("/conditions-inscription")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConditionsInscriptionPage,
});

function ConditionsInscriptionPage() {
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#0d3d21]">
      <SiteHeader />
      <LegalLayout title="Conditions d'inscription" updated="11 août 2026">
        <LegalSection title="1. Objet">
          <p>
            Les présentes conditions régissent l'inscription et la participation au Forum de
            l'Entrepreneuriat et de la Souveraineté Alimentaire (FESA 2026), organisé par la PAAF
            les 21 et 22 septembre 2026 à Dakar, Sénégal. Toute inscription via{" "}
            <Link to="/inscription">le formulaire en ligne</Link> implique l'acceptation pleine et
            entière des présentes conditions.
          </p>
        </LegalSection>

        <LegalSection title="2. Catégories et tarifs">
          <ul>
            <li>Participant sénégalais — 10 000 FCFA, pour les deux journées</li>
            <li>
              Participant non-sénégalais — 13 120 FCFA (équivalent 20 €), pour les délégations des
              pays invités et autres participants internationaux
            </li>
            <li>Stand exposant (Marché Forain, 9 m²) — 300 000 FCFA pour les deux jours</li>
            <li>Stand institutionnel (9 m²) — 1 500 000 FCFA</li>
          </ul>
          <p>
            Les accréditations VIP, presse, staff, comité scientifique et autres catégories
            institutionnelles ne sont pas ouvertes à l'auto-inscription et sont attribuées
            directement par l'organisation.
          </p>
        </LegalSection>

        <LegalSection title="3. Modalités de paiement">
          <p>
            Le règlement s'effectue en ligne au moment de l'inscription, via les moyens de paiement
            proposés sur le site (Wave, Orange Money, carte bancaire, virement). L'inscription n'est
            considérée comme confirmée qu'à réception du paiement, sauf pour les formules gratuites.
          </p>
        </LegalSection>

        <LegalSection title="4. Confirmation et badge">
          <p>
            Après confirmation, un badge nominatif portant un QR code unique est généré. Ce badge
            est strictement personnel, non transférable, et doit être présenté à l'entrée de
            l'événement. Toute utilisation frauduleuse ou duplication d'un badge pourra entraîner un
            refus d'accès.
          </p>
        </LegalSection>

        <LegalSection title="5. Annulation et remboursement">
          <p>
            Toute demande d'annulation doit être adressée par écrit à{" "}
            <a href="mailto:contact@fesaforum.com">contact@fesaforum.com</a>. Sauf disposition
            contraire communiquée par l'organisation :
          </p>
          <ul>
            <li>
              Annulation reçue plus de 15 jours avant l'événement : remboursement à hauteur de 80 %
              du montant payé (frais administratifs déduits)
            </li>
            <li>
              Annulation reçue entre 15 et 7 jours avant l'événement : remboursement à hauteur de 50
              %
            </li>
            <li>Annulation reçue moins de 7 jours avant l'événement : non remboursable</li>
            <li>
              Le transfert de votre inscription à une autre personne reste possible à tout moment
              sur simple demande écrite
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Modification ou annulation de l'événement">
          <p>
            L'organisation se réserve le droit de modifier le programme, les intervenants ou le lieu
            de l'événement pour des raisons indépendantes de sa volonté. En cas d'annulation
            complète de l'événement par l'organisation, les frais d'inscription seront intégralement
            remboursés.
          </p>
        </LegalSection>

        <LegalSection title="7. Données personnelles">
          <p>
            Les données recueillies lors de l'inscription sont traitées conformément à notre{" "}
            <Link to="/confidentialite">politique de confidentialité</Link>.
          </p>
        </LegalSection>

        <LegalSection title="8. Droit applicable et litiges">
          <p>
            Les présentes conditions sont soumises au droit sénégalais. Tout litige relatif à
            l'inscription ou à la participation au FESA 2026 sera, à défaut de résolution amiable,
            porté devant les tribunaux compétents du Sénégal.
          </p>
        </LegalSection>
      </LegalLayout>
      <SiteFooter />
    </div>
  );
}
