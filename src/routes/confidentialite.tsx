import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { LegalLayout, LegalSection } from "@/components/fesa/LegalLayout";

const TITLE = "Politique de confidentialité | FESA 2026";
const DESCRIPTION =
  "Comment le FESA 2026 et la PAAF collectent, utilisent et protègent vos données personnelles.";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#0d3d21]">
      <SiteHeader />
      <LegalLayout title="Politique de confidentialité" updated="11 août 2026">
        <LegalSection title="1. Responsable du traitement">
          <p>
            La PAAF — Plateforme Africaine pour l'Autonomisation des Femmes et des Filles,
            organisatrice du FESA 2026, est responsable du traitement des données personnelles
            collectées via ce site.
          </p>
        </LegalSection>

        <LegalSection title="2. Données collectées">
          <p>Selon votre usage du site, nous collectons :</p>
          <ul>
            <li>
              Données d'identification et de contact : nom, prénom, e-mail, téléphone, pays,
              structure/organisation
            </li>
            <li>Données professionnelles : fonction, secteur d'activité (pour les exposants)</li>
            <li>Données liées à l'inscription : formule choisie, statut de paiement</li>
            <li>Adresse e-mail fournie lors de l'inscription à la lettre d'information</li>
          </ul>
          <p>
            Aucune donnée bancaire (numéro de carte, identifiants de paiement) n'est collectée ni
            stockée par le site : les paiements sont traités directement par les prestataires (Wave,
            Orange Money, PayTech, établissements bancaires).
          </p>
        </LegalSection>

        <LegalSection title="3. Finalités du traitement">
          <ul>
            <li>Gestion de votre inscription et génération de votre badge nominatif (QR code)</li>
            <li>Contrôle d'accès à l'événement</li>
            <li>Communication relative à l'organisation du forum (programme, logistique)</li>
            <li>Envoi de la lettre d'information, si vous vous y êtes inscrit·e</li>
            <li>Statistiques de fréquentation et suivi des inscriptions par l'organisation</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Base légale et durée de conservation">
          <p>
            Le traitement repose sur l'exécution de l'inscription que vous avez demandée et, pour la
            lettre d'information, sur votre consentement. Les données des participants sont
            conservées pour la durée nécessaire à l'organisation de l'édition 2026 et à
            l'établissement de statistiques, puis archivées ou supprimées conformément aux
            obligations légales applicables.
          </p>
        </LegalSection>

        <LegalSection title="5. Destinataires des données">
          <p>
            Vos données sont accessibles à l'équipe organisatrice du FESA 2026 (staff habilité) et,
            le cas échéant, aux prestataires techniques strictement nécessaires au fonctionnement du
            site (hébergement, paiement). Elles ne sont ni vendues ni cédées à des tiers à des fins
            commerciales.
          </p>
        </LegalSection>

        <LegalSection title="6. Vos droits">
          <p>
            Conformément à la loi n° 2008-12 du 25 janvier 2008 relative à la protection des données
            à caractère personnel au Sénégal, vous disposez d'un droit d'accès, de rectification,
            d'opposition et de suppression de vos données. Vous pouvez exercer ces droits en
            écrivant à <a href="mailto:contact@fesaforum.com">contact@fesaforum.com</a>. Vous disposez
            également du droit d'introduire une réclamation auprès de la Commission de protection
            des données personnelles (CDP) du Sénégal.
          </p>
        </LegalSection>

        <LegalSection title="7. Sécurité">
          <p>
            Des mesures techniques et organisationnelles raisonnables sont mises en œuvre pour
            protéger vos données contre l'accès non autorisé, la perte ou l'altération, notamment un
            accès restreint aux données des participants aux seuls membres du staff habilités par
            l'organisation.
          </p>
        </LegalSection>

        <LegalSection title="8. Cookies">
          <p>
            Le site utilise uniquement les cookies techniques strictement nécessaires à son
            fonctionnement (par exemple, le maintien de votre session lors de l'inscription). Aucun
            cookie publicitaire ou de suivi tiers n'est déposé sans votre information préalable.
          </p>
        </LegalSection>

        <LegalSection title="9. Contact">
          <p>
            Pour toute question relative à cette politique, contactez-nous à{" "}
            <a href="mailto:contact@fesaforum.com">contact@fesaforum.com</a> ou au +221 77 477 83 60.
          </p>
        </LegalSection>
      </LegalLayout>
      <SiteFooter />
    </div>
  );
}
