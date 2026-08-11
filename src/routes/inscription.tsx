import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Loader2,
  MapPin,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
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
import { COUNTRIES } from "@/lib/countries";

const TITLE = "Inscription FESA 2026 | Dakar, 21-22 septembre 2026";
const DESCRIPTION =
  "Formulaire d'inscription au FESA 2026 : participant, stand Marché Forain (Exposant) ou stand institutionnel (Partenaire). Les autres accréditations (VIP, presse, staff...) sont attribuées par l'organisation.";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://fesa2026.com/inscription" },
    ],
    links: [{ rel: "canonical", href: "https://fesa2026.com/inscription" }],
  }),
  component: RegistrationPage,
});

const PHONE_REGEX = /^\+[1-9]\d{0,3}[\d\s-]{6,14}$/;

const detailsSchema = z.object({
  last_name: z.string().trim().min(2, "Nom requis").max(60),
  first_name: z.string().trim().min(2, "Prénom requis").max(60),
  country: z.string().trim().min(1, "Pays requis"),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  phone: z.string().trim().regex(PHONE_REGEX, "Format international requis, ex : +221771234567"),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  function: z.string().trim().max(120).optional().or(z.literal("")),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
});

type Details = z.infer<typeof detailsSchema>;

const EMPTY: Details = {
  last_name: "",
  first_name: "",
  country: "Sénégal",
  email: "",
  phone: "",
  company: "",
  function: "",
  sector: "",
};

const OPTION_BLURB: Record<string, string> = {
  Participant: "Inscription individuelle au forum avec accès complet aux sessions et au réseau.",
  Exposant: "Stand au Marché Forain — visibilité commerciale grand public et accès exposant.",
  Partenaire:
    "Stand institutionnel — espace dédié aux institutions, financeurs et partenaires stratégiques.",
};

function isExposant(p?: ProfileType | null) {
  return p?.label === "Exposant";
}
function isPartenaire(p?: ProfileType | null) {
  return p?.label === "Partenaire";
}

function RegistrationPage() {
  const navigate = useNavigate();
  const { data: event } = useQuery(eventQuery);
  const { data: allProfiles } = useQuery(profileTypesQuery(event?.id));
  const profiles = useMemo(() => (allProfiles ?? []).filter((p) => p.is_public), [allProfiles]);
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
  const needsPayment = Boolean(profile?.requires_payment);
  const steps = needsPayment
    ? ["Formule", "Informations", "Paiement"]
    : ["Formule", "Informations"];

  const summary = useMemo(() => {
    if (!profile) {
      return {
        label: "Choisissez votre formule",
        price: "—",
        blurb: "Sélectionnez un profil pour voir les détails de votre accès.",
      };
    }

    return {
      label: profile.label,
      price: Number(profile.price ?? 0).toLocaleString("fr-FR") + " FCFA",
      blurb: profile.requires_payment
        ? "Paiement requis pour finaliser votre inscription."
        : "Inscription gratuite avec accès complet au programme.",
    };
  }, [profile]);

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();

  const set = (k: keyof Details, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: "" }));
  };

  function validateDetails() {
    const parsed = detailsSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return false;
    }
    if (isExposant(profile) && !form.sector) {
      setErrors({ sector: "Sélectionnez un secteur" });
      return false;
    }
    if (isPartenaire(profile) && !form.company) {
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
      const { data, error } = await supabase.rpc("register_participant", {
        p_event_id: event.id,
        p_profile_type_id: profile.id,
        p_delegation_id: delegationId ?? "",
        p_full_name: fullName,
        p_email: form.email.trim(),
        p_phone: form.phone.trim(),
        p_company: form.company?.trim() ?? "",
        p_function: form.function?.trim() ?? "",
        p_sector: form.sector?.trim() ?? "",
        p_status: withPayment ? "paid" : "confirmed",
        p_country: form.country.trim(),
      });
      if (error) throw error;
      const participant = data?.[0];
      if (!participant) throw new Error("registration RPC returned no row");

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
    } catch (error) {
      console.error(error);
      toast.error("L'inscription n'a pas pu être enregistrée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f4eb] text-[#183b24]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[#e3dccf] bg-[#0d3d21] text-[#fdf8ef] shadow-[0_24px_60px_-24px_rgba(13,61,33,0.45)]">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#ffd8b5]">
                Inscription en ligne
              </p>
              <h1 className="mt-5 text-3xl font-black sm:text-4xl">
                Réservez votre place au FESA 2026
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-white/80">
                Choisissez votre formule, finalisez vos coordonnées et obtenez votre badge nominatif
                dès la confirmation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  <CalendarDays className="size-4" /> 21 & 22 septembre 2026
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  <MapPin className="size-4" /> Dakar, Sénégal
                </span>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="rounded-[1.25rem] bg-[#fdf8ef] p-5 text-[#0d3d21]">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#0d3d21] text-[#fdf8ef]">
                    <BadgeCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e8722a]">
                      Votre sélection
                    </p>
                    <p className="text-lg font-semibold">{summary.label}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-[#e3dccf] bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#5f6f5f]">Montant</p>
                      <p className="mt-1 font-display text-2xl font-black text-[#0d3d21]">
                        {summary.price}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#0d3d21] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#fdf8ef]">
                      {profile?.requires_payment ? "À payer" : "Gratuit"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#4f5f51]">{summary.blurb}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

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
                    ? "border-[#0d3d21] bg-[#0d3d21] text-[#fdf8ef]"
                    : done
                      ? "border-[#e8722a]/30 bg-[#fff6ed] text-[#0d3d21]"
                      : "border-[#e3dccf] bg-white text-[#5f6f5f]"
                }`}
              >
                <span className="font-mono">{n}</span> {label}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-[#e3dccf] bg-white p-6 shadow-sm sm:p-8">
            {step === 1 && (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#0d3d21]/10 text-[#0d3d21]">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0d3d21]">
                      Choisissez votre formule
                    </h2>
                    <p className="mt-1 text-sm text-[#5f6f5f]">
                      Les autres accréditations (VIP, presse, staff, comité scientifique…) sont
                      attribuées par l'organisation.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(profiles ?? []).map((p) => {
                    const selected = p.id === profileId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfileId(p.id)}
                        className={`rounded-[1.25rem] border p-4 text-left transition-all ${
                          selected
                            ? "border-[#0d3d21] bg-[#f8f4eb] shadow-sm"
                            : "border-[#e3dccf] bg-white hover:border-[#0d3d21]/30"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: p.color_code }}
                          />
                          <span className="font-semibold text-[#0d3d21]">{p.label}</span>
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-[#5f6f5f]">
                          {OPTION_BLURB[p.label] ?? ""}
                        </span>
                        <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#e8722a]">
                          <Wallet className="size-4" />
                          {Number(p.price ?? 0).toLocaleString("fr-FR")} FCFA
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
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#0d3d21]/10 text-[#0d3d21]">
                    <UserRound className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0d3d21]">Vos informations</h2>
                    <p className="mt-1 text-sm text-[#5f6f5f]">
                      Nous utiliserons ces coordonnées pour créer votre badge nominatif et vous
                      envoyer les mises à jour du forum.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field
                    id="last_name"
                    label="Nom"
                    value={form.last_name}
                    error={errors["last_name"]}
                    onChange={(v) => set("last_name", v)}
                  />
                  <Field
                    id="first_name"
                    label="Prénom"
                    value={form.first_name}
                    error={errors["first_name"]}
                    onChange={(v) => set("first_name", v)}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Select value={form.country} onValueChange={(v) => set("country", v)}>
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Choisir un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors["country"] && (
                      <p className="text-xs text-destructive">{errors["country"]}</p>
                    )}
                  </div>
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
                    label="Téléphone (format international)"
                    placeholder="+221 77 477 83 60"
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
                      isPartenaire(profile)
                        ? "Nom de l'organisation"
                        : "Structure / Organisation (optionnel)"
                    }
                    value={form.company ?? ""}
                    error={errors["company"]}
                    onChange={(v) => set("company", v)}
                  />
                  {isExposant(profile) && (
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
                      <p className="text-xs text-[#5f6f5f]">
                        Si vous faites partie d'une délégation déjà enregistrée, sélectionnez-la
                        ici.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap justify-between gap-3">
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
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#0d3d21]/10 text-[#0d3d21]">
                    <CircleDollarSign className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0d3d21]">Paiement</h2>
                    <p className="mt-1 text-sm text-[#5f6f5f]">
                      La collecte de paiement est simulée pour la démonstration, puis l'inscription
                      est finalisée automatiquement.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.25rem] border border-[#e3dccf] bg-[#f8f4eb] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#5f6f5f]">Frais de participation</p>
                      <p className="mt-1 font-display text-2xl font-black text-[#0d3d21]">
                        {summary.price}
                      </p>
                    </div>
                    <div className="rounded-full bg-[#0d3d21] px-3 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-[#fdf8ef]">
                      {profile?.label}
                    </div>
                  </div>
                </div>

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

                <div className="mt-8 flex flex-wrap justify-between gap-3">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    <ArrowLeft className="size-4" /> Retour
                  </Button>
                  <p className="text-sm text-[#5f6f5f]">
                    L'inscription sera confirmée immédiatement après le paiement simulé.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-[#e3dccf] bg-[#fbf5eb] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#0d3d21]/10 text-[#0d3d21]">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e8722a]">
                    Prévisualisation
                  </p>
                  <p className="text-lg font-semibold text-[#0d3d21]">Votre badge à l'arrivée</p>
                </div>
              </div>
              <div className="mt-5 rounded-[1.25rem] border border-[#e3dccf] bg-white p-4">
                <p className="text-sm text-[#5f6f5f]">
                  Votre badge sera généré automatiquement avec vos informations et votre QR code
                  unique.
                </p>
              </div>
            </div>
            <BadgePreview
              data={{
                eventName: event?.name ?? "FESA 2026",
                eventDates: "21 – 22 septembre 2026",
                location: event?.location ?? "Dakar, Sénégal",
                fullName,
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
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={255}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
