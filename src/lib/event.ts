import { supabase } from "@/integrations/supabase/client";

/** The event currently served by this deployment. Everything else filters by event_id. */
export const CURRENT_EVENT_SLUG = "fesa26";

/**
 * Network requests can hang indefinitely on flaky mobile/proxy connections —
 * a hung fetch leaves the UI stuck on "Chargement…" forever with no error.
 * Abort after 12s so react-query can retry (and eventually surface an error).
 */
export async function withTimeout<T>(
  run: (signal: AbortSignal) => PromiseLike<T>,
  ms = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export type EventRow = {
  id: string;
  name: string;
  slug: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  branding: Record<string, unknown> | null;
};

export type ProfileType = {
  id: string;
  event_id: string;
  label: string;
  color_code: string;
  requires_payment: boolean;
  price: number | null;
  sort_order: number;
  is_public?: boolean;
  badge_prefix?: string | null;
  ink_color?: string;
  zone_label?: string | null;
};

/** A purchasable line on the public "Formule" step — decoupled from
 * ProfileType so two price tiers (e.g. Participant sénégalais/non-sénégalais)
 * can share one badge category. */
export type Offer = {
  id: string;
  event_id: string;
  profile_type_id: string;
  kicker: string;
  name: string;
  description: string;
  price: number;
  unit_label: string;
  included_badges: number;
  is_public: boolean;
  sort_order: number;
  perks: string[];
};

export type Participant = {
  id: string;
  event_id: string;
  profile_type_id: string | null;
  offer_id: string | null;
  delegation_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  sector: string | null;
  function: string | null;
  country: string | null;
  city: string | null;
  badge_quantity: number;
  registration_id: string;
  status: string;
  created_at: string;
};

export type Delegation = {
  id: string;
  event_id: string;
  primary_contact_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  created_at: string;
};

export type Payment = {
  id: string;
  participant_id: string;
  provider: string;
  amount: number;
  status: string;
  provider_transaction_id: string | null;
  created_at: string;
  participants: { full_name: string } | null;
};

export type Registration = {
  full_name: string;
  function: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  profile_label: string | null;
  profile_color: string | null;
  profile_ink: string | null;
  zone_label: string | null;
  badge_prefix: string | null;
  offer_name: string | null;
  registration_id: string;
  status: string;
  qr_payload: string | null;
  badge_url: string | null;
  /** Status of the most recent payment row, if any ("pending" | "success" | "failed"). */
  payment_status: string | null;
};

export type DelegationName = { id: string; primary_contact_name: string };

export type EmailRegistrationMatch = { registration_id: string; full_name: string; status: string };

export const eventQuery = {
  queryKey: ["event", CURRENT_EVENT_SLUG],
  retry: 5,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<EventRow> => {
    const { data, error } = await withTimeout(
      (signal) =>
        supabase
          .from("events")
          .select("*")
          .eq("slug", CURRENT_EVENT_SLUG)
          .abortSignal(signal)
          .single(),
    );
    if (error) throw error;
    return data as EventRow;
  },
};

export const profileTypesQuery = (eventId?: string) => ({
  queryKey: ["profile_types", eventId],
  enabled: Boolean(eventId),
  retry: 5,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<ProfileType[]> => {
    const { data, error } = await withTimeout((signal) =>
      supabase
        .from("profile_types")
        .select("*")
        .eq("event_id", eventId!)
        .order("sort_order")
        .abortSignal(signal),
    );
    if (error) throw error;
    return (data ?? []) as ProfileType[];
  },
});

/** Public "Formule" step offers. Plain select (no PostgREST relationship
 * embedding) — embedding depends on foreign-key metadata that PostgREST
 * caches separately from plain table access, which has been unreliable
 * right after a table is created via the SQL editor rather than the normal
 * migration pipeline. Callers join this to profileTypesQuery client-side. */
export const offersQuery = (eventId?: string) => ({
  queryKey: ["offers", eventId],
  enabled: Boolean(eventId),
  retry: 5,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<Offer[]> => {
    const { data, error } = await withTimeout((signal) =>
      supabase
        .from("offers")
        .select("*")
        .eq("event_id", eventId!)
        .eq("is_public", true)
        .order("sort_order")
        .abortSignal(signal),
    );
    if (error) throw error;
    return (data ?? []) as Offer[];
  },
});

export const participantsQuery = (eventId?: string) => ({
  queryKey: ["participants", eventId],
  enabled: Boolean(eventId),
  queryFn: async (): Promise<Participant[]> => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", eventId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Participant[];
  },
});

export const delegationsQuery = (eventId?: string) => ({
  queryKey: ["delegations", eventId],
  enabled: Boolean(eventId),
  queryFn: async (): Promise<Delegation[]> => {
    const { data, error } = await supabase
      .from("delegations")
      .select("*")
      .eq("event_id", eventId!)
      .order("primary_contact_name");
    if (error) throw error;
    return (data ?? []) as Delegation[];
  },
});

export const paymentsQuery = (eventId?: string) => ({
  queryKey: ["payments", eventId],
  enabled: Boolean(eventId),
  queryFn: async (): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, participants!inner(full_name, event_id)")
      .eq("participants.event_id", eventId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Payment[];
  },
});

/** Public, single-row lookup — the confirmation page has no direct read
 * access to participants/badges, only this SECURITY DEFINER RPC. */
export const registrationQuery = (registrationId?: string) => ({
  queryKey: ["registration", registrationId],
  enabled: Boolean(registrationId),
  queryFn: async (): Promise<Registration | null> => {
    const { data, error } = await supabase.rpc("get_registration", {
      p_registration_id: registrationId!,
    });
    if (error) throw error;
    return (data?.[0] as Registration | undefined) ?? null;
  },
});

/** Public delegation dropdown on the registration form — names only. */
export const publicDelegationNamesQuery = (eventId?: string) => ({
  queryKey: ["delegation-names", eventId],
  enabled: Boolean(eventId),
  queryFn: async (): Promise<DelegationName[]> => {
    const { data, error } = await supabase.rpc("list_delegation_names", {
      p_event_id: eventId!,
    });
    if (error) throw error;
    return (data ?? []) as DelegationName[];
  },
});

/** "Retrouver mon badge": lookup by email, deliberately never reveals
 * whether the email exists — an empty array just means no matches. */
export async function findRegistrationsByEmail(
  eventId: string,
  email: string,
): Promise<EmailRegistrationMatch[]> {
  const { data, error } = await supabase.rpc("find_registrations_by_email", {
    p_event_id: eventId,
    p_email: email,
  });
  if (error) throw error;
  return (data ?? []) as EmailRegistrationMatch[];
}

export async function subscribeToNewsletter(eventId: string, email: string) {
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ event_id: eventId, email });
  if (error) throw error;
}

export function formatEventDates(event?: EventRow | null) {
  if (!event) return "";
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const start = new Date(event.start_date + "T00:00:00");
  const end = new Date(event.end_date + "T00:00:00");
  return `${start.getDate()} – ${fmt.format(end)}`;
}

export const SECTORS = [
  "Agro-transformation",
  "Logistique",
  "Commerce & Distribution",
  "Agriculture & Élevage",
  "Technologie & Digital",
  "Finance & Microfinance",
  "Artisanat",
  "Autre",
];
