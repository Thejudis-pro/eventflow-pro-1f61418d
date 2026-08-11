import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { BadgePreview } from "@/components/fesa/BadgePreview";
import { supabase } from "@/integrations/supabase/client";
import {
  publicDelegationNamesQuery,
  eventQuery,
  profileTypesQuery,
  SECTORS,
  type ProfileType,
} from "@/lib/event";

const TITLE = "Inscription FESA 2026 | Dakar, 21-22 septembre 2026";
const DESCRIPTION =
  "Formulaire d'inscription au FESA 2026 : choisissez votre profil (VIP, entrepreneur, institution, presse, standard) et recevez votre badge nominatif.";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: RegistrationPage,
});

const detailsSchema = z.object({
  full_name: z.string().trim().min(2, "Nom complet requis").max(120),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  phone: z.string().trim().min(6, "Téléphone requis").max(30),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  function: z.string().trim().max(120).optional().or(z.literal("")),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
});

type Details = z.infer<typeof detailsSchema>;

const EMPTY: Details = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  function: "",
  sector: "",
};

function isEntrepreneur(p?: ProfileType | null) {
  return Boolean(p && /entrepreneur/i.test(p.label));
}
function isInstitution(p?: ProfileType | null) {
  return Boolean(p && /(institution|partenaire)/i.test(p.label));
}

function RegistrationPage() {
  const navigate = useNavigate();
  const { data: event } = useQuery(eventQuery);
  const { data: profiles } = useQuery(profileTypesQuery(event?.id));
  const { data: delegations } = useQuery(publicDelegationNamesQuery(event?.id));

  const [step, setStep] = useState(1);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [delegationId, setDelegationId] = useState<string | null>(null);
  const [form, setForm] = useState<Details>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const profile = useMemo(
    () => profiles?.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );
  const needsPayment = Boolean(profile?.requires_payment) && !isInstitution(profile);
  const steps = needsPayment ? ["Profil", "Informations", "Paiement"] : ["Profil", "Informations"];

  const set = (k: keyof Details, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function validateDetails() {
    const parsed = detailsSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return false;
    }
    if (isEntrepreneur(profile) && !form.sector) {
      setErrors({ sector: "Sélectionnez un secteur" });
      return false;
    }
    if (isInstitution(profile) && !form.company) {
      setErrors({ company: "Nom de l'organisation requis" });
      return false;
    }
    setErrors({});
    return true;
  }

  async function submit(withPayment: boolean) {
    if (!event || !profile) return;
    setSubmitting(true);
    try {
      // Registration goes through a SECURITY DEFINER RPC: anonymous visitors
      // have no direct SELECT on participants, so a plain insert().select()
      // couldn't read the row back.
      const { data, error } = await supabase.rpc("register_participant", {
        p_event_id: event.id,
        p_profile_type_id: profile.id,
        p_delegation_id: delegationId,
        p_full_name: form.full_name.trim(),
        p_email: form.email.trim(),
        p_phone: form.phone.trim(),
        p_company: form.company?.trim() || null,
        p_function: form.function?.trim() || null,
        p_sector: form.sector?.trim() || null,
        p_status: withPayment ? "paid" : "confirmed",
      });
      if (error) throw error;
      const participant = data?.[0];
      if (!participant) throw new Error("registration RPC returned no row");

      // The DB trigger `create_badge_for_participant` creates the badge row
      // as soon as status is paid/confirmed — nothing to insert here.
      if (withPayment) {
        await supabase.from("payments").insert({
          participant_id: participant.id,
          provider: "paytech",
          amount: profile.price ?? 0,
          status: "success",
          provider_transaction_id: `MOCK-${participant.id.slice(0, 10).toUpperCase()}`,
        });
      }

      navigate({
        to: "/confirmation/$registrationId",
        params: { registrationId: participant.registration_id },
      });
    } catch (e) {
      console.error(e);
      toast.error("L'inscription n'a pas pu être enregistrée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Inscription</h1>
        <p className="mt-2 text-muted-foreground">
          {event?.name ?? "FESA 2026"} · 21 – 22 septembre 2026 ·{" "}
          {event?.location ?? "Dakar, Sénégal"}
        </p>

        <ol className="mt-8 flex flex-wrap gap-3">
          {steps.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary/40 bg-secondary text-secondary-foreground"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span className="font-mono">{n}</span> {label}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold">Type de profil</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Le profil détermine le badge, l'accès et les frais éventuels.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(profiles ?? []).map((p) => {
                    const selected = p.id === profileId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfileId(p.id)}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          selected
                            ? "border-primary bg-secondary"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: p.color_code }}
                          />
                          <span className="font-semibold">{p.label}</span>
                        </span>
                        <span className="mt-2 block text-sm text-muted-foreground">
                          {p.requires_payment && !/institution|partenaire/i.test(p.label)
                            ? `${Number(p.price ?? 0).toLocaleString("fr-FR")} FCFA`
                            : "Gratuit / sur invitation"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex justify-end">
                  <Button
                    variant="institutional"
                    size="lg"
                    disabled={!profileId}
                    onClick={() => setStep(2)}
                  >
                    Continuer <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold">Vos informations</h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field
                    id="full_name"
                    label="Nom complet"
                    value={form.full_name}
                    error={errors["full_name"]}
                    onChange={(v) => set("full_name", v)}
                  />
                  <Field
                    id="email"
                    label="E-mail"
                    type="email"
                    value={form.email}
                    error={errors["email"]}
                    onChange={(v) => set("email", v)}
                  />
                  <Field
                    id="phone"
                    label="Téléphone (WhatsApp)"
                    value={form.phone}
                    error={errors["phone"]}
                    onChange={(v) => set("phone", v)}
                  />
                  <Field
                    id="function"
                    label="Fonction"
                    value={form.function ?? ""}
                    error={errors["function"]}
                    onChange={(v) => set("function", v)}
                  />
                  <Field
                    id="company"
                    label={
                      isInstitution(profile) ? "Nom de l'organisation" : "Structure / entreprise"
                    }
                    value={form.company ?? ""}
                    error={errors["company"]}
                    onChange={(v) => set("company", v)}
                  />
                  {isEntrepreneur(profile) && (
                    <div className="space-y-2">
                      <Label htmlFor="sector">Secteur d'activité</Label>
                      <Select value={form.sector ?? ""} onValueChange={(v) => set("sector", v)}>
                        <SelectTrigger id="sector">
                          <SelectValue placeholder="Choisir un secteur" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTORS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors["sector"] && (
                        <p className="text-xs text-destructive">{errors["sector"]}</p>
                      )}
                    </div>
                  )}
                  {(delegations ?? []).length > 0 && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="delegation">Délégation (optionnel)</Label>
                      <Select
                        value={delegationId ?? "none"}
                        onValueChange={(v) => setDelegationId(v === "none" ? null : v)}
                      >
                        <SelectTrigger id="delegation">
                          <SelectValue placeholder="Aucune délégation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune délégation</SelectItem>
                          {(delegations ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.primary_contact_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Si vous faites partie d'une délégation déjà enregistrée, sélectionnez-la
                        ici.
                      </p>
                    </div>
                  )}
                </div>

                {isInstitution(profile) && (
                  <p className="mt-6 rounded-lg border border-border bg-secondary p-4 text-sm text-secondary-foreground">
                    Les inscriptions Institution / Partenaire sont gratuites : aucune étape de
                    paiement ne vous sera demandée.
                  </p>
                )}

                <div className="mt-8 flex justify-between">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" /> Retour
                  </Button>
                  <Button
                    variant="institutional"
                    size="lg"
                    disabled={submitting}
                    onClick={() => {
                      if (!validateDetails()) return;
                      if (needsPayment) setStep(3);
                      else void submit(false);
                    }}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    {needsPayment ? "Aller au paiement" : "Valider mon inscription"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-xl font-semibold">Paiement</h2>
                <div className="mt-6 flex items-baseline justify-between rounded-lg border border-border bg-surface p-5">
                  <span className="text-sm text-muted-foreground">
                    Frais de participation — {profile?.label}
                  </span>
                  <span className="font-display text-3xl font-bold text-primary-deep">
                    {Number(profile?.price ?? 0).toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Intégration PayTech / PayDunya à venir. Ce bouton simule un paiement réussi pour
                  la démonstration.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="hero"
                    size="lg"
                    disabled={submitting}
                    onClick={() => void submit(true)}
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Payer avec PayTech
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={submitting}
                    onClick={() => void submit(true)}
                  >
                    <CreditCard className="size-4" /> Payer avec PayDunya
                  </Button>
                </div>
                <div className="mt-8">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    <ArrowLeft className="size-4" /> Retour
                  </Button>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Aperçu de votre badge</p>
            <BadgePreview
              data={{
                eventName: event?.name ?? "FESA 2026",
                eventDates: "21 – 22 septembre 2026",
                location: event?.location ?? "Dakar, Sénégal",
                fullName: form.full_name,
                functionLabel: form.function,
                company: form.company,
                profileLabel: profile?.label ?? "Profil",
                profileColor: profile?.color_code ?? "#2E7D32",
                registrationId: "REG-••••••",
              }}
            />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={255}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
