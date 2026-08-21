import { useEffect, useRef, useState } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Maps Supabase Auth errors to clear French messages. Deliberately keeps
 * "wrong password" and "unknown email" identical on login — distinguishing
 * them lets an attacker enumerate which emails have accounts. */
export function authErrorMessage(error: unknown, context: "login" | "signup"): string {
  const code = (error as AuthError | undefined)?.code;

  if (context === "login") {
    switch (code) {
      case "email_not_confirmed":
        return "Confirmez votre e-mail avant de vous connecter (vérifiez votre boîte de réception).";
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return "Trop de tentatives. Réessayez dans quelques minutes.";
      case "invalid_credentials":
        return "E-mail ou mot de passe incorrect.";
      default:
        return "E-mail ou mot de passe incorrect.";
    }
  }

  switch (code) {
    case "user_already_exists":
      return "Un compte existe déjà avec cet e-mail.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Utilisez au moins 8 caractères, avec des lettres et des chiffres.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    case "signup_disabled":
      return "Les inscriptions sont temporairement désactivées.";
    default:
      return "La création du compte a échoué. Réessayez.";
  }
}

/** Basic client-side throttle: after `maxAttempts` failures, locks the form
 * for `lockoutSeconds`. This is a UX safeguard, not the real defense — actual
 * rate limiting is enforced server-side by Supabase Auth itself. */
export function useAttemptThrottle(maxAttempts = 5, lockoutSeconds = 30) {
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!lockedUntil) return;
    function tick() {
      const secondsLeft = Math.ceil((lockedUntil! - Date.now()) / 1000);
      if (secondsLeft <= 0) {
        setLockedUntil(null);
        setFailures(0);
        setRemaining(0);
        window.clearInterval(intervalRef.current);
        return;
      }
      setRemaining(secondsLeft);
    }
    tick();
    intervalRef.current = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [lockedUntil]);

  function registerFailure() {
    const next = failures + 1;
    setFailures(next);
    if (next >= maxAttempts) {
      setLockedUntil(Date.now() + lockoutSeconds * 1000);
    }
  }

  function reset() {
    setFailures(0);
    setLockedUntil(null);
    setRemaining(0);
  }

  return { locked: lockedUntil !== null, remaining, registerFailure, reset };
}

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
      // Staff rows are self-provisioned on first authenticated visit
      // (no triggers are allowed on the auth schema).
      await supabase.rpc("ensure_staff_profile");
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("approved, email, full_name, role")
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
    role: (profile?.role as "admin" | "checkin" | undefined) ?? "admin",
    email: profile?.email ?? session?.user.email ?? null,
  };
}

export async function signOutStaff() {
  await supabase.auth.signOut();
}
