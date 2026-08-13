import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgePlus, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { profileTypesQuery } from "@/lib/event";
import { COUNTRIES } from "@/lib/countries";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "Sénégal",
  city: "",
  company: "",
  profileTypeId: "",
};

type Form = typeof EMPTY;

/**
 * Staff-only shortcut around the public /inscription wizard: creates a
 * participant + badge directly via register_participant with status
 * "confirmed" and no offer/payment — the same path DelegationCsvImport
 * already uses for bulk rows, exposed here for one-off comp badges (press,
 * VIP, staff...).
 */
export function CreateFreeBadgeForm({ eventId }: { eventId?: string | undefined }) {
  const queryClient = useQueryClient();
  const { data: profiles } = useQuery(profileTypesQuery(eventId));
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState<{
    registrationId: string;
    fullName: string;
  } | null>(null);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
    if (!fullName || !form.email.trim() || !form.profileTypeId) {
      toast.error("Prénom, nom, email et catégorie sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("register_participant", {
        p_event_id: eventId,
        p_profile_type_id: form.profileTypeId,
        // No offer for free staff-created badges; the RPC accepts a NULL uuid.
        p_offer_id: null as unknown as string,
        p_delegation_id: "",
        p_full_name: fullName,
        p_email: form.email.trim(),
        p_phone: form.phone.trim(),
        p_company: form.company.trim(),
        p_function: "",
        p_sector: "",
        p_status: "confirmed",
        p_country: form.country.trim(),
        p_city: form.city.trim(),
        p_badge_quantity: 1,
      });
      if (error) throw error;
      const created = data?.[0];
      if (!created?.registration_id) throw new Error("register_participant returned no row");
      toast.success(`Badge créé pour ${fullName}.`);
      setLastCreated({ registrationId: created.registration_id, fullName });
      setForm(EMPTY);
      void queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de créer ce badge. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          id="fb-first-name"
          label="Prénom"
          value={form.firstName}
          onChange={(v) => set("firstName", v)}
          required
        />
        <Field
          id="fb-last-name"
          label="Nom"
          value={form.lastName}
          onChange={(v) => set("lastName", v)}
          required
        />
        <Field
          id="fb-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          required
        />
        <Field
          id="fb-phone"
          label="Téléphone"
          type="tel"
          value={form.phone}
          onChange={(v) => set("phone", v)}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fb-country">Pays</Label>
          <Select value={form.country} onValueChange={(v) => set("country", v)}>
            <SelectTrigger id="fb-country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field id="fb-city" label="Ville" value={form.city} onChange={(v) => set("city", v)} />
        <Field
          id="fb-company"
          label="Organisation"
          value={form.company}
          onChange={(v) => set("company", v)}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fb-profile">Catégorie</Label>
          <Select value={form.profileTypeId} onValueChange={(v) => set("profileTypeId", v)}>
            <SelectTrigger id="fb-profile">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {(profiles ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: p.color_code }}
                    />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="institutional" disabled={submitting || !eventId}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BadgePlus className="size-4" />
          )}
          Créer le badge
        </Button>
        {lastCreated && (
          <Link
            to="/confirmation/$registrationId"
            params={{ registrationId: lastCreated.registrationId }}
            target="_blank"
            className="text-sm font-semibold text-accent underline underline-offset-2"
          >
            Voir / imprimer le badge de {lastCreated.fullName}
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
