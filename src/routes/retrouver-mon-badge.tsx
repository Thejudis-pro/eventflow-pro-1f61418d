import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { RegistrationFooter, RegistrationHeader } from "@/components/fesa/RegistrationChrome";
import { eventQuery, findRegistrationsByEmail } from "@/lib/event";
import { REG } from "@/lib/fesa-registration-theme";

const TITLE = "Retrouver mon badge — FESA 2026";
const DESCRIPTION =
  "Retrouvez votre badge et votre référence d'inscription au FESA 2026 à partir de votre adresse email.";

export const Route = createFileRoute("/retrouver-mon-badge")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RetrouverMonBadgePage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Paiement en attente",
  paid: "Badge prêt",
  confirmed: "Badge prêt",
  checked_in: "Badge prêt · entrée validée",
};

function RetrouverMonBadgePage() {
  const { data: event } = useQuery(eventQuery);
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const { data: matches, isFetching } = useQuery({
    queryKey: ["find-registrations", event?.id, submittedEmail],
    enabled: Boolean(event?.id && submittedEmail),
    queryFn: () => findRegistrationsByEmail(event!.id, submittedEmail!),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Saisissez votre adresse e-mail.");
      return;
    }
    setSubmittedEmail(trimmed);
  }

  return (
    <div style={{ background: REG.cream, color: REG.dark, fontFamily: "Manrope, system-ui, sans-serif" }} className="min-h-screen">
      <RegistrationHeader />

      <main className="mx-auto max-w-2xl px-4 py-16 lg:px-8">
        <div style={{ font: "800 12px/1 Manrope, sans-serif", letterSpacing: "0.12em", color: REG.orange }}>
          RETROUVER MON BADGE
        </div>
        <h1 className="mt-3.5" style={{ font: "800 36px/1.1 Manrope, sans-serif", letterSpacing: "-0.03em" }}>
          Retrouvez votre inscription
        </h1>
        <p className="mt-4" style={{ font: "400 15.5px/1.7 Manrope, sans-serif", color: REG.muted }}>
          Saisissez l&rsquo;adresse e-mail utilisée lors de votre inscription. Si elle correspond à une
          inscription, vous verrez le lien vers votre badge ci-dessous.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aissatou@cooperative.sn"
            className="h-[52px] flex-1 rounded-[14px]"
            style={{ border: `1px solid ${REG.lineDark}`, background: "#fff", font: "600 15px/1 Manrope, sans-serif", color: REG.dark }}
          />
          <button
            type="submit"
            disabled={isFetching}
            className="flex h-[52px] items-center justify-center gap-2.5 rounded-2xl px-7"
            style={{ background: REG.orange, color: "#fff", font: "800 15px/1 Manrope, sans-serif" }}
          >
            {isFetching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Rechercher
          </button>
        </form>

        {submittedEmail && !isFetching && (
          <div className="mt-8">
            {(matches ?? []).length === 0 ? (
              <p style={{ font: "500 14px/1.6 Manrope, sans-serif", color: REG.muted }}>
                Si une inscription existe pour cette adresse, vous recevrez ses détails ci-dessus. Vérifiez
                l&rsquo;orthographe de votre e-mail ou contactez le secrétariat technique.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {(matches ?? []).map((m) => (
                  <Link
                    key={m.registration_id}
                    to="/confirmation/$registrationId"
                    params={{ registrationId: m.registration_id }}
                    className="flex items-center justify-between gap-4 rounded-2xl px-6 py-5"
                    style={{ border: `1px solid ${REG.line}`, background: "#fff" }}
                  >
                    <div>
                      <div style={{ font: "800 15px/1.2 Manrope, sans-serif" }}>{m.full_name}</div>
                      <div className="mt-1" style={{ font: "500 12.5px/1.5 Manrope, sans-serif", color: REG.mutedLight }}>
                        {m.registration_id} · {STATUS_LABEL[m.status] ?? m.status}
                      </div>
                    </div>
                    <ArrowRight className="size-4 flex-none" style={{ color: REG.green }} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <RegistrationFooter />
    </div>
  );
}
