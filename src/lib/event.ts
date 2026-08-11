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
