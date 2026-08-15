import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CalendarDays, CreditCard, Loader2, MapPin } from "lucide-react";
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
import { RegistrationFooter, RegistrationHeader } from "@/components/fesa/RegistrationChrome";
import { BadgePreview } from "@/components/fesa/BadgePreview";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/payments/checkout.functions";
import {
  eventQuery,
  offersQuery,
  profileTypesQuery,
  publicDelegationNamesQuery,
  SECTORS,
  type Offer,
  type ProfileType,
} from "@/lib/event";
import { COUNTRIES } from "@/lib/countries";
import { DIAL_CODES, PRIORITY_DIAL_COUNTRIES } from "@/lib/dial-codes";
import { ARCHIVO_FONT_HREF, fmt, REG } from "@/lib/fesa-registration-theme";

const TITLE = "Inscription FESA 2026 | Dakar, 21-22 septembre 2026";
const DESCRIPTION =
  "Formulaire d'inscription au FESA 2026 : participant, stand Marché Forain (Exposant) ou stand institutionnel (Partenaire). Les autres accréditations (VIP, presse, staff...) sont attribuées par l'organisation.";
const OTHER_COUNTRY = "Autre pays";

// CEDEAO neighbors first (most of this event's audience), then the rest of COUNTRIES alphabetically.
const PHONE_COUNTRY_ORDER = [
  ...PRIORITY_DIAL_COUNTRIES,
  ...COUNTRIES.filter((c) => !(PRIORITY_DIAL_COUNTRIES as readonly string[]).includes(c)),
];

const inscriptionSearchSchema = z.object({
  intent: z.enum(["stand"]).optional(),
});

export const Route = createFileRoute("/inscription")({
  validateSearch: inscriptionSearchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://www.fesaforum.com/inscription" },
    ],
    links: [
      { rel: "canonical", href: "https://www.fesaforum.com/inscription" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: ARCHIVO_FONT_HREF },
    ],
  }),
  component: RegistrationPage,
});

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,17}$/;

const detailsSchema = z.object({
  last_name: z.string().trim().min(2, "Nom requis").max(60),
  first_name: z.string().trim().min(2, "Prénom requis").max(60),
  country: z.string().trim().min(1, "Pays requis"),
  otherCountry: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Ville requise").max(80),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  phoneCode: z.string().trim().min(1),
  phone: z.string().trim().regex(PHONE_REGEX, "Numéro de téléphone invalide"),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  sector: z.string().trim().max(80).optional().or(z.literal("")),
});

type Details = z.infer<typeof detailsSchema>;

const EMPTY: Details = {
  last_name: "",
  first_name: "",
  country: "Sénégal",
  otherCountry: "",
  city: "",
  email: "",
  phoneCode: "+221",
  phone: "",
  company: "",
  sector: "",
};

type OfferWithProfile = Offer & { profile_types: Pick<ProfileType, "color_code" | "label"> | null };

function isExposant(label?: string | null) {
  return label === "Exposant";
}
function isPartenaire(label?: string | null) {
  return label === "Partenaire";
}

function RegistrationPage() {
  const navigate = useNavigate();
  const { intent } = Route.useSearch();
  const {
    data: event,
    isLoading: eventLoading,
    isError: eventErrored,
    refetch: refetchEvent,
  } = useQuery(eventQuery);
  const {
    data: offers,
    isLoading: offersLoading,
    isError: offersErrored,
    refetch: refetchOffers,
  } = useQuery(offersQuery(event?.id));
  const {
    data: profileTypes,
    isLoading: profileTypesLoading,
    isError: profileTypesErrored,
    refetch: refetchProfileTypes,
  } = useQuery(profileTypesQuery(event?.id));
  const { data: delegations } = useQuery(publicDelegationNamesQuery(event?.id));

  // While the event itself is still loading, the offer/profile queries are
  // disabled (isLoading === false) — count that as loading too, otherwise the
  // page shows neither a spinner nor an error.
  const isLoadingFormules = eventLoading || (!eventErrored && (offersLoading || profileTypesLoading));
  const formulesErrored = eventErrored || offersErrored || profileTypesErrored;

  // The "offers" table joined to its profile_type for color/label. If it's
  // empty (e.g. not yet seeded, or a PostgREST relationship-cache hiccup
  // right after the table was created), fall back to synthesizing one offer
  // per public, priced profile_type directly — keeps registration working
  // even when the richer multi-tier-offer data isn't available yet.
  const offersMerged = useMemo<OfferWithProfile[]>(() => {
    const publicProfileTypes = (profileTypes ?? []).filter((p) => p.is_public);
    if (offers && offers.length > 0) {
      return offers.map((o) => {
        const pt = publicProfileTypes.find((p) => p.id === o.profile_type_id);
        return { ...o, profile_types: pt ? { color_code: pt.color_code, label: pt.label } : null };
      });
    }
    if (!isLoadingFormules && publicProfileTypes.length > 0) {
      return publicProfileTypes
        .filter((p) => p.requires_payment && p.price)
        .map((p) => ({
          id: `pt:${p.id}`,
          event_id: p.event_id,
          profile_type_id: p.id,
          kicker: "TICKET",
          name: p.label,
          description: "",
          price: Number(p.price),
          unit_label: "par badge",
          included_badges: 0,
          is_public: true,
          sort_order: p.sort_order,
          perks: [],
          profile_types: { color_code: p.color_code, label: p.label },
        }));
    }
    return [];
  }, [offers, profileTypes, isLoadingFormules]);

  // Arriving via a "Réserver un stand" CTA should only offer stand formulas,
  // not the participant tickets alongside them.
  const visibleOffers = useMemo(
    () => (intent === "stand" ? offersMerged.filter((o) => o.included_badges > 0) : offersMerged),
    [offersMerged, intent],
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [delegationId, setDelegationId] = useState<string | null>(null);
  const [form, setForm] = useState<Details>(EMPTY);
  const [phoneCountry, setPhoneCountry] = useState("Sénégal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState<{ id: string; registrationId: string } | null>(null);

  const offer = useMemo<OfferWithProfile | null>(
    () => offersMerged.find((o) => o.id === offerId) ?? null,
    [offersMerged, offerId],
  );
  const isStand = (offer?.included_badges ?? 0) > 0;
  // One registration form = one badge. Stands still include multiple badges
  // (the exhibitor names those after paying), but tickets are always qty 1.
  const badgeQty = isStand ? (offer?.included_badges ?? 1) : 1;
  const total = offer?.price ?? 0;
  const needsPayment = total > 0;
  const profileLabel = offer?.profile_types?.label ?? "Profil";
  const profileColor = offer?.profile_types?.color_code ?? "#0b7a3c";

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
  const effectiveCountry =
    form.country === OTHER_COUNTRY ? form.otherCountry?.trim() || "" : form.country;

  const set = (k: keyof Details, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: "" }));
  };

  function validateDetails() {
    const parsed = detailsSchema.safeParse(form);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    }
    if (form.country === OTHER_COUNTRY && !form.otherCountry?.trim()) {
      next["otherCountry"] = "Précisez votre pays";
    }
    if (isExposant(profileLabel) && !form.sector) {
      next["sector"] = "Sélectionnez un secteur";
    }
    if (isPartenaire(profileLabel) && !form.company) {
      next["company"] = "Nom de l'organisation requis";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function registerParticipant(status: "pending" | "confirmed") {
    if (!event || !offer) throw new Error("missing event or offer");
    const { data, error } = await supabase.rpc("register_participant", {
      p_event_id: event.id,
      p_profile_type_id: offer.profile_type_id,
      // Synthetic fallback offers (built client-side from profile_types when
      // the offers table is empty/unreachable) use a "pt:" id — there's no
      // real offers row to reference for those.
      p_offer_id: (offer.id.startsWith("pt:") ? null : offer.id) as unknown as string,
      p_delegation_id: delegationId ?? "",
      p_full_name: fullName,
      p_email: form.email.trim(),
      p_phone: `${form.phoneCode} ${form.phone.trim()}`.trim(),
      p_company: form.company?.trim() ?? "",
      p_function: "",
      p_sector: form.sector?.trim() ?? "",
      p_status: status,
      p_country: effectiveCountry,
      p_city: form.city.trim(),
      p_badge_quantity: badgeQty,
    });
    if (error) throw error;
    const participant = data?.[0];
    if (!participant?.registration_id) throw new Error("registration RPC returned no row");
    return { id: participant.id, registrationId: participant.registration_id };
  }

  async function continueFromIdentity() {
    if (!validateDetails()) return;
    setSubmitting(true);
    try {
      const result =
        registered ?? (await registerParticipant(needsPayment ? "pending" : "confirmed"));
      setRegistered(result);
      if (needsPayment) {
        setStep(3);
      } else {
        navigate({
          to: "/confirmation/$registrationId",
          params: { registrationId: result.registrationId },
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("L'inscription n'a pas pu être enregistrée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  async function pay(provider: "paytech") {
    if (!registered) return;
    setSubmitting(true);
    try {
      const { checkoutUrl } = await createCheckoutSession({
        data: { participantId: registered.id, provider },
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      // The server keeps these messages purposely non-sensitive (no keys/
      // stack traces), so it's safe to surface them directly -- this is
      // what actually tells us *why* a payment failed to initiate.
      const detail =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : undefined;
      toast.error(
        detail
          ? `Le paiement n'a pas pu être initié : ${detail}`
          : "Le paiement n'a pas pu être initié. Réessayez.",
      );
      setSubmitting(false);
    }
  }

  const stepDefs: { title: string; hint: string }[] = [
    { title: "Formule", hint: "Ticket ou stand" },
    { title: "Identité", hint: "Porteur du badge" },
    { title: "Paiement", hint: "Confirmation" },
  ];

  return (
    <div
      style={{
        background: REG.cream,
        color: REG.dark,
        fontFamily: "Manrope, system-ui, sans-serif",
      }}
      className="min-h-screen"
    >
      <RegistrationHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-16">
        <div
          className="flex items-center gap-0 overflow-x-auto border-b pb-6"
          style={{ borderColor: REG.line }}
        >
          {stepDefs.map((s, i) => {
            const n = i + 1;
            const on = n === step;
            const done = n < step;
            return (
              <div key={s.title} className="flex min-w-0 flex-1 items-center gap-0">
                <button
                  type="button"
                  onClick={() => n < step && setStep(n as 1 | 2 | 3)}
                  disabled={n > step}
                  className="flex flex-none items-center gap-3 rounded-2xl py-2 pl-2 pr-3.5"
                  style={{
                    background: on ? "#fff" : "transparent",
                    boxShadow: on ? "0 6px 18px rgba(13,61,33,0.10)" : "none",
                    cursor: n < step ? "pointer" : "default",
                  }}
                >
                  <span
                    className="flex size-[34px] flex-none items-center justify-center rounded-[11px]"
                    style={{
                      background: on ? REG.orange : done ? REG.green : "#eee7db",
                      color: on || done ? "#fff" : "#9aa79f",
                      font: "800 14px/1 Manrope, sans-serif",
                    }}
                  >
                    {n}
                  </span>
                  <span className="flex flex-col items-start gap-[3px]">
                    <span
                      style={{ font: "800 13.5px/1.15 Manrope, sans-serif", whiteSpace: "nowrap" }}
                    >
                      {s.title}
                    </span>
                    <span
                      style={{
                        font: "500 11px/1.15 Manrope, sans-serif",
                        color: REG.mutedLight,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.hint}
                    </span>
                  </span>
                </button>
                {n !== stepDefs.length && (
                  <div
                    className="mx-2.5 h-px flex-1"
                    style={{ background: done ? REG.green : REG.line }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_386px]">
          <div className="min-w-0">
            {step === 1 && (
              <div>
                <div
                  style={{
                    font: "800 12px/1 Manrope, sans-serif",
                    letterSpacing: "0.12em",
                    color: REG.orange,
                  }}
                >
                  ÉTAPE 1 · VOTRE FORMULE
                </div>
                <h1
                  className="mt-3.5"
                  style={{ font: "800 40px/1.08 Manrope, sans-serif", letterSpacing: "-0.035em" }}
                >
                  Que souhaitez-vous
                  <br />
                  réserver ?
                </h1>
                <p
                  className="mt-4 max-w-[520px]"
                  style={{ font: "400 15.5px/1.7 Manrope, sans-serif", color: REG.muted }}
                >
                  Une seule formule par inscription. Les stands incluent des badges exposants — vous
                  nommerez les porteurs après le paiement.
                </p>

                {isLoadingFormules && (
                  <div className="mt-8 flex items-center gap-2" style={{ color: REG.muted }}>
                    <Loader2 className="size-4 animate-spin" /> Chargement des formules…
                  </div>
                )}

                {!isLoadingFormules && offersMerged.length === 0 && (
                    <div
                      className="mt-8 rounded-[18px] px-6 py-5"
                      style={{
                        border: `1px solid ${REG.line}`,
                        background: "#fff",
                        font: "500 14px/1.6 Manrope, sans-serif",
                        color: REG.muted,
                      }}
                    >
                      <p>
                        {formulesErrored
                          ? "Les formules n'ont pas pu être chargées. Vérifiez votre connexion puis réessayez, ou contactez le secrétariat technique au +221 77 477 83 60."
                          : "Aucune formule n'est disponible pour le moment. Réessayez dans un instant ou contactez le secrétariat technique au +221 77 477 83 60."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          refetchEvent();
                          refetchOffers();
                          refetchProfileTypes();
                        }}
                      >
                        Réessayer
                      </Button>
                    </div>
                  )}

                <div className="mt-8 flex flex-col gap-3">
                  {visibleOffers.map((o) => {
                    const on = o.id === offerId;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setOfferId(o.id);
                          setRegistered(null);
                        }}
                        className="flex w-full items-center justify-between gap-8 rounded-[18px] px-6 py-[22px] text-left"
                        style={{
                          background: "#fff",
                          border: on ? `2px solid ${REG.green}` : `1px solid ${REG.lineDark}`,
                          boxShadow: on ? "0 12px 30px rgba(13,61,33,0.10)" : "none",
                        }}
                      >
                        <span className="flex min-w-0 flex-col gap-[7px]">
                          <span
                            style={{
                              font: "800 11.5px/1 Manrope, sans-serif",
                              letterSpacing: "0.1em",
                              color: REG.mutedLight,
                            }}
                          >
                            {o.kicker}
                          </span>
                          <span style={{ font: "800 22px/1.15 Manrope, sans-serif" }}>
                            {o.name}
                          </span>
                          <span
                            className="max-w-[430px]"
                            style={{
                              font: "500 13.5px/1.55 Manrope, sans-serif",
                              color: REG.muted,
                            }}
                          >
                            {o.description}
                          </span>
                        </span>
                        <span className="flex flex-none items-center gap-[22px]">
                          <span className="flex flex-col items-end gap-1">
                            <span style={{ font: "800 26px/1 Manrope, sans-serif" }}>
                              {fmt(o.price)}
                            </span>
                            <span
                              style={{
                                font: "700 11.5px/1 Manrope, sans-serif",
                                color: REG.mutedLight,
                              }}
                            >
                              FCFA · {o.unit_label}
                            </span>
                          </span>
                          <span
                            className="size-6 flex-none rounded-full"
                            style={{
                              background: "#fff",
                              border: on ? `7px solid ${REG.green}` : `2px solid ${REG.lineDark}`,
                            }}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-[18px] px-6 py-[22px] sm:gap-8"
                  style={{ border: `1px solid ${REG.line}`, background: "#fff" }}
                >
                  <div>
                    <div style={{ font: "800 15px/1.2 Manrope, sans-serif" }}>Nombre de badges</div>
                    <div
                      className="mt-[5px]"
                      style={{ font: "500 13px/1.55 Manrope, sans-serif", color: REG.mutedLight }}
                    >
                      {isStand
                        ? `${offer?.included_badges ?? 0} badges exposants sont inclus dans ce stand.`
                        : "Un badge nominatif par personne, réglé en une seule fois. Une inscription par formulaire."}
                    </div>
                  </div>
                  <div
                    className="min-w-7 flex-none text-center"
                    style={{ font: "800 22px/1 Manrope, sans-serif" }}
                  >
                    {badgeQty}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div
                  style={{
                    font: "800 12px/1 Manrope, sans-serif",
                    letterSpacing: "0.12em",
                    color: REG.orange,
                  }}
                >
                  ÉTAPE 2 · IDENTITÉ
                </div>
                <h1
                  className="mt-3.5"
                  style={{ font: "800 40px/1.08 Manrope, sans-serif", letterSpacing: "-0.035em" }}
                >
                  Qui participe ?
                </h1>
                <p
                  className="mt-4 max-w-[520px]"
                  style={{ font: "400 15.5px/1.7 Manrope, sans-serif", color: REG.muted }}
                >
                  Ces informations sont imprimées sur le badge. Le numéro WhatsApp reçoit la
                  confirmation et les mises à jour du programme.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-[18px_20px] sm:grid-cols-2">
                  <RegField
                    id="first_name"
                    label="PRÉNOM"
                    placeholder="Aïssatou"
                    autoComplete="given-name"
                    value={form.first_name}
                    error={errors["first_name"]}
                    onChange={(v) => set("first_name", v)}
                  />
                  <RegField
                    id="last_name"
                    label="NOM"
                    placeholder="Ndiaye"
                    autoComplete="family-name"
                    value={form.last_name}
                    error={errors["last_name"]}
                    onChange={(v) => set("last_name", v)}
                  />
                  <RegField
                    id="email"
                    label="EMAIL"
                    type="email"
                    placeholder="aissatou@cooperative.sn"
                    autoComplete="email"
                    value={form.email}
                    error={errors["email"]}
                    onChange={(v) => set("email", v)}
                  />
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone">
                      <RegLabel>TÉLÉPHONE / WHATSAPP</RegLabel>
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={phoneCountry}
                        onValueChange={(name) => {
                          setPhoneCountry(name);
                          set("phoneCode", DIAL_CODES[name] ?? form.phoneCode);
                        }}
                      >
                        <SelectTrigger
                          id="phoneCode"
                          className="h-[52px] w-[92px] shrink-0 rounded-[14px] px-3"
                          style={{
                            border: `1px solid ${REG.lineDark}`,
                            background: "#fff",
                            font: "600 15px/1 Manrope, sans-serif",
                            color: REG.dark,
                          }}
                        >
                          <SelectValue>{form.phoneCode}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PHONE_COUNTRY_ORDER.map((name) => (
                            <SelectItem key={name} value={name}>
                              {DIAL_CODES[name] ?? ""} · {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="77 000 00 00"
                        maxLength={255}
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        className="h-[52px] flex-1 rounded-[14px]"
                        style={{
                          border: `1px solid ${REG.lineDark}`,
                          background: "#fff",
                          font: "600 15px/1 Manrope, sans-serif",
                          color: REG.dark,
                        }}
                      />
                    </div>
                    {errors["phone"] ? (
                      <p className="text-xs text-destructive">{errors["phone"]}</p>
                    ) : (
                      <p style={{ font: "500 11.5px/1.4 Manrope, sans-serif", color: REG.mutedLight }}>
                        Numéro WhatsApp de préférence — l'indicatif est ajouté automatiquement.
                      </p>
                    )}
                  </div>
                  <RegSelectField
                    id="country"
                    label="PAYS"
                    value={form.country}
                    onChange={(v) => set("country", v)}
                    options={[...COUNTRIES, OTHER_COUNTRY]}
                  />
                  <RegField
                    id="city"
                    label="VILLE"
                    placeholder="Dakar"
                    autoComplete="address-level2"
                    value={form.city}
                    error={errors["city"]}
                    onChange={(v) => set("city", v)}
                  />
                  {form.country === OTHER_COUNTRY && (
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <RegLabel>PRÉCISEZ VOTRE PAYS</RegLabel>
                      <input
                        value={form.otherCountry ?? ""}
                        onChange={(e) => set("otherCountry", e.target.value)}
                        placeholder="Cameroun, Maroc, France…"
                        name="otherCountry"
                        autoComplete="country-name"
                        className="h-[52px] rounded-[14px] px-4 outline-none"
                        style={{
                          border: `2px solid ${REG.green}`,
                          background: "#fff",
                          font: "600 15px/1 Manrope, sans-serif",
                          color: REG.dark,
                        }}
                      />
                      {errors["otherCountry"] && (
                        <p className="text-xs text-destructive">{errors["otherCountry"]}</p>
                      )}
                      <span
                        style={{
                          font: "500 12.5px/1.5 Manrope, sans-serif",
                          color: REG.mutedLight,
                        }}
                      >
                        Le pays saisi ici apparaît sur le badge, sous votre organisation.
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <RegLabel>
                      {isPartenaire(profileLabel) ? "NOM DE L'ORGANISATION" : "ORGANISATION"} ·
                      TELLE QU&rsquo;ELLE APPARAÎTRA SUR LE BADGE
                    </RegLabel>
                    <input
                      value={form.company ?? ""}
                      onChange={(e) => set("company", e.target.value)}
                      placeholder="Coopérative Takku Ligey"
                      name="company"
                      autoComplete="organization"
                      className="h-[52px] rounded-[14px] px-4 outline-none"
                      style={{
                        border: `1px solid ${REG.lineDark}`,
                        background: "#fff",
                        font: "600 15px/1 Manrope, sans-serif",
                        color: REG.dark,
                      }}
                    />
                    {errors["company"] && (
                      <p className="text-xs text-destructive">{errors["company"]}</p>
                    )}
                  </div>
                  {isExposant(profileLabel) && (
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <RegLabel>SECTEUR D&rsquo;ACTIVITÉ</RegLabel>
                      <RegSelectField
                        id="sector"
                        hideLabel
                        value={form.sector ?? ""}
                        onChange={(v) => set("sector", v)}
                        options={SECTORS}
                        placeholder="Choisir un secteur"
                      />
                      {errors["sector"] && (
                        <p className="text-xs text-destructive">{errors["sector"]}</p>
                      )}
                    </div>
                  )}
                  {(delegations ?? []).length > 0 && (
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <RegLabel>DÉLÉGATION (OPTIONNEL)</RegLabel>
                      <RegSelectField
                        id="delegation"
                        hideLabel
                        value={delegationId ?? "none"}
                        onChange={(v) => setDelegationId(v === "none" ? null : v)}
                        options={["none", ...(delegations ?? []).map((d) => d.id)]}
                        renderLabel={(v) =>
                          v === "none"
                            ? "Aucune délégation"
                            : (delegations?.find((d) => d.id === v)?.primary_contact_name ?? v)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div
                  style={{
                    font: "800 12px/1 Manrope, sans-serif",
                    letterSpacing: "0.12em",
                    color: REG.orange,
                  }}
                >
                  ÉTAPE 3 · PAIEMENT
                </div>
                <h1
                  className="mt-3.5"
                  style={{ font: "800 40px/1.08 Manrope, sans-serif", letterSpacing: "-0.035em" }}
                >
                  Paiement sécurisé
                </h1>
                <p
                  className="mt-4 max-w-[520px]"
                  style={{ font: "400 15.5px/1.7 Manrope, sans-serif", color: REG.muted }}
                >
                  Vous serez redirigé vers votre prestataire de paiement. Le badge est généré dès la
                  confirmation du paiement.
                </p>

                <div
                  className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-[18px] px-6 py-[22px] sm:gap-8"
                  style={{ border: `1px solid ${REG.line}`, background: "#fff" }}
                >
                  <div>
                    <div
                      style={{ font: "500 13px/1.55 Manrope, sans-serif", color: REG.mutedLight }}
                    >
                      Montant à régler
                    </div>
                    <div className="mt-1.5" style={{ font: "800 30px/1 Manrope, sans-serif" }}>
                      {fmt(total)}{" "}
                      <span
                        style={{ font: "700 13px/1 Manrope, sans-serif", color: REG.mutedLight }}
                      >
                        FCFA
                      </span>
                    </div>
                  </div>
                  <div
                    className="rounded-full px-4 py-2"
                    style={{
                      background: REG.dark,
                      color: REG.cream,
                      font: "800 12px/1 Manrope, sans-serif",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {offer?.name}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    disabled={submitting}
                    onClick={() => void pay("paytech")}
                    className="flex h-14 items-center justify-center gap-2.5"
                    style={{ background: REG.dark, color: "#fff" }}
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Payer avec PayTech
                  </Button>
                </div>
                <p
                  className="mt-4 max-w-[520px]"
                  style={{ font: "500 13px/1.6 Manrope, sans-serif", color: REG.mutedLight }}
                >
                  Wave, Orange Money, Free Money, carte bancaire (Visa/Mastercard) et virement sont
                  proposés à l&rsquo;étape suivante, sur la page sécurisée de PayTech.
                </p>
              </div>
            )}

            <div
              className="mt-10 flex flex-col-reverse gap-4 border-t pt-[26px] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              style={{ borderColor: REG.line }}
            >
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => setStep((s) => (s === 3 ? 2 : s === 2 ? 1 : s))}
                className="h-[58px] w-full rounded-2xl px-6 sm:w-auto"
                style={{ visibility: step === 1 ? "hidden" : "visible" }}
              >
                <ArrowLeft className="size-4" />{" "}
                {step === 2 ? "Retour aux tarifs" : "Étape précédente"}
              </Button>
              {step !== 3 && (
                <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                  <Button
                    disabled={(step === 1 && !offerId) || submitting}
                    onClick={() => (step === 1 ? setStep(2) : void continueFromIdentity())}
                    className="flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl px-7 sm:w-auto"
                    style={{ background: REG.orange, color: "#fff" }}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    {step === 1
                      ? "Continuer vers l'identité"
                      : needsPayment
                        ? "Continuer vers le paiement"
                        : "Valider mon inscription"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div className="rounded-[20px] p-7" style={{ background: REG.dark, color: REG.cream }}>
              <div className="flex items-baseline justify-between">
                <div
                  style={{
                    font: "800 12px/1 Manrope, sans-serif",
                    letterSpacing: "0.1em",
                    color: "#f0913f",
                  }}
                >
                  VOTRE INSCRIPTION
                </div>
                <div
                  style={{
                    font: "800 11px/1 Manrope, sans-serif",
                    letterSpacing: "0.08em",
                    color: "rgba(251,247,240,0.5)",
                  }}
                >
                  ÉTAPE {step}/3
                </div>
              </div>
              <div className="mt-4" style={{ font: "800 22px/1.2 Manrope, sans-serif" }}>
                {offer?.name ?? "Choisissez votre formule"}
              </div>
              <div
                className="mt-1.5"
                style={{
                  font: "500 13px/1.6 Manrope, sans-serif",
                  color: "rgba(251,247,240,0.66)",
                }}
              >
                {offer?.description ?? "Sélectionnez une formule pour voir les détails."}
              </div>
              <div className="my-5 h-px" style={{ background: "rgba(251,247,240,0.14)" }} />
              <div className="flex flex-col gap-3">
                <SummaryLine
                  label={isStand ? "Stand" : "Badges"}
                  value={offer ? `1 × ${fmt(offer.price)}` : "—"}
                />
                <SummaryLine label="Badges inclus" value={String(badgeQty)} />
                <SummaryLine label="Catégorie" value={isStand ? "Exposant" : "Participant"} />
              </div>
              <div className="my-5 h-px" style={{ background: "rgba(251,247,240,0.14)" }} />
              <div className="flex items-baseline justify-between">
                <div
                  style={{
                    font: "800 13px/1 Manrope, sans-serif",
                    letterSpacing: "0.06em",
                    color: "rgba(251,247,240,0.7)",
                  }}
                >
                  TOTAL
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span style={{ font: "800 30px/1 Manrope, sans-serif" }}>{fmt(total)}</span>
                  <span
                    style={{
                      font: "700 13px/1 Manrope, sans-serif",
                      color: "rgba(251,247,240,0.6)",
                    }}
                  >
                    FCFA
                  </span>
                </div>
              </div>
              <div
                className="mt-2.5"
                style={{ font: "500 12px/1.6 Manrope, sans-serif", color: "rgba(251,247,240,0.5)" }}
              >
                Frais de plateforme inclus. Facture disponible après paiement.
              </div>
            </div>

            <div
              className="rounded-[20px] p-6"
              style={{ border: `1px solid ${REG.line}`, background: "#fff" }}
            >
              <div
                style={{
                  font: "800 12px/1 Manrope, sans-serif",
                  letterSpacing: "0.1em",
                  color: REG.mutedLight,
                }}
              >
                INCLUS DANS CETTE FORMULE
              </div>
              <div className="mt-3.5 flex flex-col gap-2.5">
                {(offer?.perks ?? ["Sélectionnez une formule pour voir ce qui est inclus."]).map(
                  (p) => (
                    <div
                      key={p}
                      className="flex gap-2.5"
                      style={{ font: "500 13.5px/1.45 Manrope, sans-serif", color: REG.body }}
                    >
                      <span style={{ color: REG.green, fontWeight: 800 }}>✓</span>
                      {p}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="flex justify-center overflow-x-auto">
              <BadgePreview
                data={{
                  eventName: event?.name ?? "FESA 2026",
                  eventDates: "21 & 22 septembre 2026",
                  location: event?.location ?? "Dakar, CICES",
                  fullName,
                  company: form.company,
                  country: effectiveCountry,
                  city: form.city,
                  profileLabel,
                  profileColor,
                  registrationId: registered?.registrationId ?? "REG-••••••",
                  qrValue: null,
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <RegistrationFooter />
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between gap-4"
      style={{ font: "600 13.5px/1.4 Manrope, sans-serif" }}
    >
      <span style={{ color: "rgba(251,247,240,0.7)" }}>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}

function RegLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        font: "800 11.5px/1 Manrope, sans-serif",
        letterSpacing: "0.08em",
        color: "#42544a",
      }}
    >
      {children}
    </span>
  );
}

function RegField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string | undefined;
  placeholder?: string | undefined;
  autoComplete?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        <RegLabel>{label}</RegLabel>
      </Label>
      <Input
        id={id}
        name={id}
        autoComplete={autoComplete}
        type={type}
        value={value}
        maxLength={255}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-[52px] rounded-[14px]"
        style={{
          border: `1px solid ${REG.lineDark}`,
          background: "#fff",
          font: "600 15px/1 Manrope, sans-serif",
          color: REG.dark,
        }}
      />
      {hint && !error && (
        <p style={{ font: "500 11.5px/1.4 Manrope, sans-serif", color: REG.mutedLight }}>{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RegSelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  hideLabel,
  renderLabel,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  hideLabel?: boolean;
  renderLabel?: (v: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {!hideLabel && label && (
        <Label htmlFor={id}>
          <RegLabel>{label}</RegLabel>
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-[52px] rounded-[14px]"
          style={{
            border: `1px solid ${REG.lineDark}`,
            background: "#fff",
            font: "600 15px/1 Manrope, sans-serif",
            color: REG.dark,
          }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {renderLabel ? renderLabel(o) : o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
