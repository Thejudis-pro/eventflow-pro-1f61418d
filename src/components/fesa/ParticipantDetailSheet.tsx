import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, IdCard, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BadgePreview } from "./BadgePreview";
import { supabase } from "@/integrations/supabase/client";
import { downloadBadgePdf, renderBadgePdfBlob } from "@/lib/badge-export";
import { badgeQuery, type EventRow, type Participant, type Payment, type ProfileType } from "@/lib/event";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  confirmed: "Confirmé",
  checked_in: "Enregistré",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  success: "Réussi",
  failed: "Échoué",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}

export function ParticipantDetailSheet({
  participant,
  profile,
  profileLabel,
  profileColor,
  event,
  payments,
  onOpenChange,
}: {
  participant: Participant | null;
  profile: ProfileType | undefined;
  profileLabel: string;
  profileColor: string;
  event: EventRow | undefined;
  payments: Payment[];
  onOpenChange: (open: boolean) => void;
}) {
  const { data: badge } = useQuery({ ...badgeQuery(participant?.id), enabled: participant !== null });
  const badgeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"download" | "print" | null>(null);

  async function markPrinted() {
    if (!participant) return;
    void supabase.rpc("mark_badge_printed", { p_registration_id: participant.registration_id });
  }

  async function handleDownload() {
    if (!badgeRef.current || !participant) return;
    setBusy("download");
    try {
      await downloadBadgePdf(badgeRef.current, `badge-fesa2026-${participant.registration_id}.pdf`);
      await markPrinted();
    } catch (error) {
      console.error(error);
      toast.error("Le badge n'a pas pu être téléchargé.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (!badgeRef.current || !participant) return;
    setBusy("print");
    try {
      const blob = await renderBadgePdfBlob(badgeRef.current);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      await markPrinted();
    } catch (error) {
      console.error(error);
      toast.error("Le badge n'a pas pu être préparé pour l'impression.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={participant !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        {participant && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: profileColor }}
                />
                {participant.full_name}
              </SheetTitle>
              <SheetDescription>
                {participant.registration_id} · {profileLabel}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {STATUS_LABEL[participant.status] ?? participant.status}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {participant.badge_quantity} badge{participant.badge_quantity > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" value={participant.email} />
                <Field label="Téléphone" value={participant.phone} />
                <Field label="Organisation" value={participant.company} />
                <Field label="Fonction" value={participant.function} />
                <Field label="Secteur" value={participant.sector} />
                <Field label="Pays" value={participant.country} />
                <Field label="Ville" value={participant.city} />
                <Field
                  label="Inscrit le"
                  value={new Date(participant.created_at).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
              </div>

              <div className="border-t border-border pt-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <IdCard className="size-3.5" /> Badge
                </p>
                {badge ? (
                  <>
                    <div className="mt-3 w-full overflow-x-auto">
                      <div ref={badgeRef} className="w-fit">
                        <BadgePreview
                          data={{
                            eventName: event?.name ?? "FESA 2026",
                            eventDates: "21 & 22 septembre 2026",
                            location: event?.location ?? "Dakar, CICES",
                            fullName: participant.full_name,
                            company: participant.company,
                            country: participant.country,
                            city: participant.city,
                            profileLabel,
                            profileColor,
                            profileInk: profile?.ink_color,
                            zoneLabel: profile?.zone_label,
                            badgePrefix: profile?.badge_prefix,
                            registrationId: participant.registration_id,
                            qrValue: badge.qr_payload,
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void handleDownload()}>
                        {busy === "download" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        Télécharger (PDF)
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void handlePrint()}>
                        {busy === "print" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Printer className="size-4" />
                        )}
                        Imprimer
                      </Button>
                    </div>
                    {badge.printed_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Dernière impression :{" "}
                        {new Date(badge.printed_at).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pas encore de badge généré pour ce participant.
                  </p>
                )}
              </div>

              {payments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Paiements
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {p.amount.toLocaleString("fr-FR")} FCFA · {p.provider}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
