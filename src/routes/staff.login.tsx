import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, useAttemptThrottle } from "@/lib/auth";

export const Route = createFileRoute("/staff/login")({
  head: () => ({
    meta: [{ title: "Connexion organisateur" }, { name: "robots", content: "noindex" }],
  }),
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const throttle = useAttemptThrottle();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (throttle.locked) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      throttle.reset();
      void navigate({ to: "/dashboard" });
    } catch (err) {
      console.error(err);
      throttle.registerFailure();
      toast.error(authErrorMessage(err, "login"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-2">
          <Lock className="size-5 text-primary" />
          <h1 className="text-xl font-bold">Espace organisateur</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Accès réservé au staff FESA 2026.</p>

        <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            variant="institutional"
            disabled={submitting || throttle.locked}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {throttle.locked ? `Réessayez dans ${throttle.remaining}s` : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            to="/staff/signup"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Créer un compte organisateur
          </Link>
        </p>
      </div>
    </div>
  );
}
