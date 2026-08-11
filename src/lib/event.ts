import { supabase } from "@/integrations/supabase/client";

/** The event currently served by this deployment. Everything else filters by event_id. */
export const CURRENT_EVENT_SLUG = "fesa26";

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
};

export type Participant = {
  id: string;
  event_id: string;
  profile_type_id: string | null;
  delegation_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  sector: string | null;
  function: string | null;
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

export type Badge = {
  id: string;
  participant_id: string;
  qr_payload: string;
  badge_url: string;
  generated_at: string;
  sent_email: boolean;
  sent_whatsapp: boolean;
};

export const eventQuery = {
  queryKey: ["event", CURRENT_EVENT_SLUG],
  queryFn: async (): Promise<EventRow> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", CURRENT_EVENT_SLUG)
      .single();
    if (error) throw error;
    return data as EventRow;
  },
};

export const profileTypesQuery = (eventId?: string) => ({
  queryKey: ["profile_types", eventId],
  enabled: Boolean(eventId),
  queryFn: async (): Promise<ProfileType[]> => {
    const { data, error } = await supabase
      .from("profile_types")
      .select("*")
      .eq("event_id", eventId!)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as ProfileType[];
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

export const badgeQuery = (participantId?: string) => ({
  queryKey: ["badge", participantId],
  enabled: Boolean(participantId),
  queryFn: async (): Promise<Badge | null> => {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .eq("participant_id", participantId!)
      .maybeSingle();
    if (error) throw error;
    return data as Badge | null;
  },
});

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
