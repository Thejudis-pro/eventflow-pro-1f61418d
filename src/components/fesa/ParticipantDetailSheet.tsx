import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Download,
  IdCard,
  Loader2,
  Mail,
  Pencil,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BadgePreview } from "./BadgePreview";
import { supabase } from "@/integrations/supabase/client";
import { downloadBadgePdf, renderBadgePdfBlob } from "@/lib/badge-export";
import { sendRegistrationEmail } from "@/lib/email/send-registration-email.functions";
import {
  badgeQuery,
  type EventRow,
  type Participant,
  type Payment,
  type ProfileType,
} from "@/lib/event";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  confirmed: "Gratuit",
  checked_in: "Enregistré",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  success: "Réussi",
  failed: "Échoué",
};

const EDIT_FIELDS: { key: keyof EditForm; label: string; type?: string }[] = [
  { key: "full_name", label: "Nom complet" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Téléphone" },
  { key: "company", label: "Organisation" },
  { key: "function", label: "Fonction" },
  { key: "sector", label: "Secteur" },
  { key: "country", label: "Pays" },
  { key: "city", label: "Ville" },
];

type EditForm = {
  full_name: string;
  email: string;
  phone: string;
  company: string;
  function: string;
  sector: string;
  country: string;
  city: string;
  badge_quantity: string;
};

function toEditForm(p: Participant): EditForm {
  return {
    full_name: p.full_name,
    email: p.email,
    phone: p.phone ?? "",
    company: p.company ?? "",
    function: p.function ?? "",
    sector: p.sector ?? "",
    country: p.country ?? "",
    city: p.city ?? "",
    badge_quantity: String(p.badge_quantity),
  };
}

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
  const queryClient = useQueryClient();
  const { data: badge } = useQuery({
    ...badgeQuery(participant?.id),
    enabled: participant !== null,
  });
  const badgeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"download" | "print" | "email" | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setForm(participant ? toEditForm(participant) : null);
  }, [participant]);

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

  async function handleResendEmail() {
    if (!participant) return;
    setBusy("email");
    try {
      await sendRegistrationEmail({ data: { participantId: participant.id, force: true } });
      toast.success(`Email de confirmation renvoyé à ${participant.email}.`);
    } catch (error) {
      console.error(error);
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`L'email n'a pas pu être envoyé : ${detail}`);
    } finally {
      setBusy(null);
    }
  }

  /** Manual override for when the PayTech/Wave payment actually went through
   * but the IPN webhook never confirmed it here (never received, or errored)
   * -- staff can see the real payment succeeded on their own PayTech/Wave
   * side and unblock the participant instead of editing the DB by hand. */
  async function handleMarkPaid(paymentId: string) {
    if (!participant) return;
    setMarkingPaidId(paymentId);
    try {
      const { error } = await supabase.rpc("mark_payment_paid_by_staff", {
        p_payment_id: paymentId,
      });
      if (error) throw error;
      toast.success(`Paiement confirmé pour ${participant.full_name}.`);
      await queryClient.invalidateQueries({ queryKey: ["participants", event?.id] });
      await queryClient.invalidateQueries({ queryKey: ["payments", event?.id] });
      await sendRegistrationEmail({ data: { participantId: participant.id } }).catch(
        (emailError: unknown) => {
          console.error(emailError);
          toast.error("Paiement confirmé, mais l'email n'a pas pu être envoyé automatiquement.");
        },
      );
    } catch (error) {
      console.error(error);
      toast.error("Impossible de marquer ce paiement comme reçu.");
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleSave() {
    if (!participant || !form) return;
    const badgeQuantity = Math.max(1, Number.parseInt(form.badge_quantity, 10) || 1);
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Nom et email sont requis.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("participants")
        .update({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          function: form.function.trim() || null,
          sector: form.sector.trim() || null,
          country: form.country.trim() || null,
          city: form.city.trim() || null,
          badge_quantity: badgeQuantity,
        })
        .eq("id", participant.id);
      if (error) throw error;
      toast.success("Participant mis à jour.");
      await queryClient.invalidateQueries({ queryKey: ["participants", event?.id] });
      setEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre à jour ce participant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!participant) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("participants").delete().eq("id", participant.id);
      if (error) throw error;
      toast.success("Participant supprimé.");
      await queryClient.invalidateQueries({ queryKey: ["participants", event?.id] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer ce participant.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={participant !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        {participant && form && (
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

            <div className="mt-4 flex flex-wrap gap-2">
              {!editing ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" /> Modifier
                </Button>
              ) : (
                <>
                  <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      setForm(toEditForm(participant));
                      setEditing(false);
                    }}
                  >
                    <X className="size-4" /> Annuler
                  </Button>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="ml-auto" disabled={deleting}>
                    <Trash2 className="size-4" /> Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer {participant.full_name} ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Supprime définitivement ce participant, son badge, ses paiements et ses
                      check-ins. Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      onClick={(e) => {
                        e.preventDefault();
                        void handleDelete();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="mt-5 flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {STATUS_LABEL[participant.status] ?? participant.status}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {participant.badge_quantity} badge{participant.badge_quantity > 1 ? "s" : ""}
                </span>
              </div>

              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  {EDIT_FIELDS.map((f) => (
                    <div key={f.key} className="flex flex-col gap-1">
                      <Label htmlFor={`edit-${f.key}`} className="text-xs">
                        {f.label}
                      </Label>
                      <Input
                        id={`edit-${f.key}`}
                        type={f.type ?? "text"}
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        disabled={saving}
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-badge_quantity" className="text-xs">
                      Nombre de badges
                    </Label>
                    <Input
                      id="edit-badge_quantity"
                      type="number"
                      min={1}
                      value={form.badge_quantity}
                      onChange={(e) => setForm({ ...form, badge_quantity: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                </div>
              ) : (
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
              )}

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
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void handleDownload()}
                      >
                        {busy === "download" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        Télécharger (PDF)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void handlePrint()}
                      >
                        {busy === "print" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Printer className="size-4" />
                        )}
                        Imprimer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void handleResendEmail()}
                      >
                        {busy === "email" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Mail className="size-4" />
                        )}
                        Renvoyer par email
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
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {p.amount.toLocaleString("fr-FR")} FCFA · {p.provider}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                          {p.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={markingPaidId !== null}
                              onClick={() => void handleMarkPaid(p.id)}
                            >
                              {markingPaidId === p.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <BadgeCheck className="size-3.5" />
                              )}
                              Marquer comme reçu
                            </Button>
                          )}
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
