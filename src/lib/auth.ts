import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStaffSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["staff-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("approved, email, full_name")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    loading: session === undefined || (Boolean(session) && profileLoading),
    session,
    approved: profile?.approved ?? false,
    email: profile?.email ?? session?.user.email ?? null,
  };
}

export async function signOutStaff() {
  await supabase.auth.signOut();
}
