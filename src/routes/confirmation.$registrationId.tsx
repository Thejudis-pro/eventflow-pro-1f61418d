import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Download, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { RegistrationFooter, RegistrationHeader } from "@/components/fesa/RegistrationChrome";
import { BadgePreview } from "@/components/fesa/BadgePreview";
import { eventQuery, registrationQuery } from "@/lib/event";
import { downloadBadgePdf, downloadIcs, renderBadgePdfBlob } from "@/lib/badge-export";
import { ARCHIVO_FONT_HREF, REG } from "@/lib/fesa-registration-theme";

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
    links: [
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: ARCHIVO_FONT_HREF },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { registrationId } = Route.useParams();
  const { data: event } = useQuery(eventQuery);
  const { data: registration, isLoading } = useQuery({
    ...registrationQuery(registrationId),
    refetchInterval: (query) => {
      const status = query.state.data?.payment_status;
      return status === "pending" ? 3000 : false;
    },
  });

  const badgeRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const isPendingPayment = registration?.payment_status === "pending";
  const firstName = (registration?.full_name ?? "").split(" ")[0] ?? "";

  // No WhatsApp Business API credentials -- instead, this opens the
  // participant's own WhatsApp pre-filled with a message to the PAAF
  // secretariat's number, so staff can send the badge back manually.
  const whatsappHref = registration
    ? `https://wa.me/221774778360?text=${encodeURIComponent(
        `Bonjour, je souhaite recevoir mon badge FESA 2026 par WhatsApp.\nRéférence : ${registrationId}\nNom : ${registration.full_name}`,
      )}`
    : undefined;

  async function handleDownloadPdf() {
    if (!badgeRef.current) return;
    setDownloading(true);
    try {
      await downloadBadgePdf(badgeRef.current, `badge-fesa2026-${registrationId}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error("Le badge n'a pas pu être téléchargé.");
    } finally {
      setDownloading(false);
    }
  }

  // Sends the actual badge file (not just a text link) via the device's
  // native share sheet, so the user can pick WhatsApp and it arrives as a
  // real attachment. Falls back to downloading the PDF + opening WhatsApp
  // for browsers without file-sharing support (mostly desktop).
  async function handleShareBadgeOnWhatsapp() {
    if (!badgeRef.current || !registration) return;
    setSharing(true);
    try {
      const filename = `badge-fesa2026-${registrationId}.pdf`;
      const blob = await renderBadgePdfBlob(badgeRef.current);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Mon badge FESA 2026",
          text: `Badge FESA 2026 — ${registration.full_name} (réf. ${registrationId})`,
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.info("Le PDF a été téléchargé — joignez-le dans la conversation WhatsApp qui s'ouvre.");
      window.open(whatsappHref, "_blank", "noopener,noreferrer");
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      console.error(error);
      toast.error("Le badge n'a pas pu être partagé.");
    } finally {
      setSharing(false);
    }
  }

  function handleAddToCalendar() {
    if (!event) {
      toast.error("Chargement en cours, réessayez dans un instant.");
      return;
    }
    try {
      downloadIcs({
        uid: `${registrationId}@fesaforum.com`,
        title: event.name,
        description: `Votre inscription FESA 2026 — référence ${registrationId}.`,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        filename: `fesa2026-${registrationId}.ics`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Le fichier calendrier n'a pas pu être généré.");
    }
  }

  return (
    <div style={{ background: REG.cream, color: REG.dark, fontFamily: "Manrope, system-ui, sans-serif" }} className="min-h-screen">
      <RegistrationHeader />

      <main className="mx-auto max-w-7xl px-4 py-14 lg:px-16">
        {isLoading ? (
          <div className="flex items-center gap-2" style={{ color: REG.muted }}>
            <Loader2 className="size-4 animate-spin" /> Chargement de votre inscription…
          </div>
        ) : !registration ? (
          <div style={{ font: "600 16px/1.6 Manrope, sans-serif", color: REG.muted }}>
            Inscription introuvable pour cet identifiant.
          </div>
        ) : isPendingPayment ? (
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-2"
              style={{ background: "#fdf3e7", color: "#8f3d10", font: "800 12px/1 Manrope, sans-serif", letterSpacing: "0.04em" }}
            >
              <Loader2 className="size-3.5 animate-spin" /> PAIEMENT EN COURS DE CONFIRMATION
            </div>
            <h1 className="mt-5" style={{ font: "800 34px/1.15 Manrope, sans-serif", letterSpacing: "-0.03em" }}>
              Presque terminé, {firstName || "cher participant"}.
            </h1>
            <p className="mt-4" style={{ font: "400 15.5px/1.7 Manrope, sans-serif", color: REG.muted }}>
              Nous attendons la confirmation de votre prestataire de paiement. Cette page se met à jour
              automatiquement dès que le paiement est validé — inutile de la recharger.
            </p>
          </div>
        ) : (
          <>
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-[15px] py-2"
              style={{ background: "#e9f3ec", color: "#0b7a3c", font: "800 12px/1 Manrope, sans-serif", letterSpacing: "0.04em" }}
            >
              <span className="size-1.5 rounded-full" style={{ background: "#0b7a3c" }} />
              INSCRIPTION CONFIRMÉE
            </div>
            <h1 className="mt-[18px]" style={{ font: "800 40px/1.08 Manrope, sans-serif", letterSpacing: "-0.035em" }}>
              Votre badge est prêt,
              <br />
              {firstName}.
            </h1>
            <p className="mt-4 max-w-[520px]" style={{ font: "400 15.5px/1.7 Manrope, sans-serif", color: REG.muted }}>
              Il est aussi parti par e-mail. Présentez le QR à l&rsquo;entrée du CICES — l&rsquo;impression
              sur place reste possible au guichet accréditation.
            </p>

            <div className="mt-8 grid gap-8" style={{ gridTemplateColumns: "359px minmax(0,1fr)" }}>
              <div ref={badgeRef} className="w-fit">
                <BadgePreview
                  data={{
                    eventName: event?.name ?? "FESA 2026",
                    eventDates: "21 & 22 septembre 2026",
                    location: event?.location ?? "Dakar, CICES",
                    fullName: registration.full_name,
                    company: registration.company,
                    country: registration.country,
                    city: registration.city,
                    profileLabel: registration.profile_label ?? "Participant",
                    profileColor: registration.profile_color ?? "#0b7a3c",
                    profileInk: registration.profile_ink,
                    zoneLabel: registration.zone_label,
                    badgePrefix: registration.badge_prefix,
                    registrationId,
                    qrValue: registration.qr_payload,
                  }}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-[18px] p-6" style={{ border: `1px solid ${REG.line}`, background: "#fff" }}>
                  <div style={{ font: "800 11.5px/1 Manrope, sans-serif", letterSpacing: "0.1em", color: REG.mutedLight }}>
                    RÉFÉRENCE
                  </div>
                  <div className="mt-2.5" style={{ font: "800 24px/1.1 Manrope, sans-serif" }}>
                    {registrationId}
                  </div>
                  <div className="mt-2" style={{ font: "500 13px/1.6 Manrope, sans-serif", color: REG.muted }}>
                    {registration.offer_name ?? registration.profile_label}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPdf()}
                    disabled={downloading}
                    className="flex h-14 items-center justify-between rounded-2xl px-[22px]"
                    style={{ background: REG.green, color: "#fff", font: "800 15px/1 Manrope, sans-serif" }}
                  >
                    Télécharger le badge (PDF)
                    {downloading ? <Loader2 className="size-[18px] animate-spin" /> : <Download className="size-[18px]" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="flex h-14 items-center justify-between rounded-2xl px-[22px]"
                    style={{ background: "#fff", border: `1px solid ${REG.lineDark}`, font: "800 15px/1 Manrope, sans-serif" }}
                  >
                    Ajouter au calendrier
                    <CalendarPlus className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShareBadgeOnWhatsapp()}
                    disabled={sharing}
                    className="flex h-14 items-center justify-between rounded-2xl px-[22px]"
                    style={{ background: REG.creamLight, font: "800 15px/1 Manrope, sans-serif" }}
                  >
                    Envoyer le badge sur WhatsApp
                    {sharing ? <Loader2 className="size-[18px] animate-spin" /> : <MessageCircle className="size-[18px]" />}
                  </button>
                </div>

                <div
                  className="py-1.5 pl-4"
                  style={{ borderLeft: `3px solid ${REG.orange}`, font: "500 13.5px/1.7 Manrope, sans-serif", color: REG.muted }}
                >
                  Le badge est nominatif. Une copie reste disponible depuis « Retrouver mon badge ».
                </div>

                <Link
                  to="/"
                  className="mt-2 self-start"
                  style={{ font: "700 14px/1 Manrope, sans-serif", color: REG.green }}
                >
                  Retour à l&rsquo;accueil
                </Link>
              </div>
            </div>
          </>
        )}
      </main>

      <RegistrationFooter />
    </div>
  );
}
