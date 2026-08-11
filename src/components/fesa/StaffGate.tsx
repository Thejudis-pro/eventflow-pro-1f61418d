import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { useStaffSession, signOutStaff } from "@/lib/auth";

/** Wraps staff-only pages (dashboard, check-in): redirects to /staff/login
 * when signed out, and blocks access until an admin approves the account. */
export function StaffGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { loading, session, approved, email } = useStaffSession();

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/staff/login" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
          <ShieldAlert className="size-10 text-accent" />
          <h1 className="mt-4 text-2xl font-bold">Compte en attente de validation</h1>
          <p className="mt-2 text-muted-foreground">
            {email} n'a pas encore été approuvé pour accéder à l'espace organisateur. Demandez à un
            administrateur de valider votre compte.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => void signOutStaff()}>
            Se déconnecter
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return <>{children}</>;
}

export function StaffSignOutButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOutStaff();
        void navigate({ to: "/staff/login" });
      }}
    >
      Se déconnecter
    </Button>
  );
}
