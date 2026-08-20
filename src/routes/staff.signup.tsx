import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, useAttemptThrottle } from "@/lib/auth";

const TITLE = "Créer un compte organisateur — FESA 2026";
const DESCRIPTION = "Créer un compte organisateur pour l'espace d'administration du FESA 2026.";

export const Route = createFileRoute("/staff/signup")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffSignupPage,
});

function StaffSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const throttle = useAttemptThrottle();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (throttle.locked) return;
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || undefined } },
      });
      if (error) throw error;
      throttle.reset();
      setDone(true);
    } catch (err) {
      console.error(err);
      throttle.registerFailure();
      toast.error(authErrorMessage(err, "signup"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-xl font-bold">Compte créé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre compte est en attente de validation par un administrateur. Si une confirmation par
            e-mail est requise, vérifiez votre boîte de réception avant de vous connecter.
          </p>
          <Button asChild className="mt-6 w-full" variant="institutional">
            <Link to="/staff/login">Aller à la connexion</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-card">
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" />
          <h1 className="text-xl font-bold">Créer un compte organisateur</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Le compte devra être validé manuellement avant d'accéder aux données.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
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
              minLength={8}
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
            {throttle.locked ? `Réessayez dans ${throttle.remaining}s` : "Créer le compte"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            to="/staff/login"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
