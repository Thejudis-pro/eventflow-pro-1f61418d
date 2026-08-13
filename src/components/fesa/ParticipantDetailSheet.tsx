import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Participant, Payment } from "@/lib/event";

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
  profileLabel,
  profileColor,
  payments,
  onOpenChange,
}: {
  participant: Participant | null;
  profileLabel: string;
  profileColor: string;
  payments: Payment[];
  onOpenChange: (open: boolean) => void;
}) {
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
