import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMockPayment, resolveMockPayment } from "@/lib/payments/mock-pay.functions";
import { fmt, REG } from "@/lib/fesa-registration-theme";

export const Route = createFileRoute("/dev/mock-pay/$paymentId")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: MockPayPage,
});

/**
 * Stand-in "hosted checkout page" used while PAYMENTS_MODE !== 'live' — lets
 * the full registration → payment → badge flow be exercised end-to-end
 * before real PayTech credentials exist. Both buttons run through the
 * exact same confirmPayment() path the real webhook will use.
 */
function MockPayPage() {
  const { paymentId } = Route.useParams();
  const { data: payment, isLoading, refetch } = useQuery({
    queryKey: ["mock-payment", paymentId],
    queryFn: () => getMockPayment({ data: { paymentId } }),
  });

  const resolve = useMutation({
    mutationFn: (status: "success" | "failed") => resolveMockPayment({ data: { paymentId, status } }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: REG.creamLight }}>
      <div
        className="w-full max-w-sm rounded-2xl border bg-white p-8"
        style={{ borderColor: REG.line, font: "500 14px/1.6 Manrope, sans-serif" }}
      >
        <div style={{ font: "800 12px/1 Manrope, sans-serif", letterSpacing: "0.1em", color: REG.mutedLight }}>
          SIMULATEUR DE PAIEMENT
        </div>
        {isLoading || !payment ? (
          <div className="mt-6 flex items-center gap-2" style={{ color: REG.muted }}>
            <Loader2 className="size-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <>
            <div className="mt-3" style={{ font: "800 22px/1.2 Manrope, sans-serif", color: REG.dark }}>
              {fmt(payment.amount)} FCFA
            </div>
            <div className="mt-1" style={{ color: REG.muted }}>
              {payment.fullName} · {payment.provider === "paytech" ? "PayTech" : "PayDunya"} (simulé)
            </div>

            {payment.status !== "pending" ? (
              <div
                className="mt-6 rounded-xl px-4 py-3"
                style={{
                  background: payment.status === "success" ? "#e9f3ec" : "#fdecea",
                  color: payment.status === "success" ? "#0b7a3c" : "#b8321f",
                  font: "700 13px/1.5 Manrope, sans-serif",
                }}
              >
                {payment.status === "success"
                  ? "Paiement confirmé — retournez à la page de confirmation."
                  : "Paiement marqué en échec."}
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  onClick={() => resolve.mutate("success")}
                  disabled={resolve.isPending}
                  style={{ background: REG.green, color: "#fff" }}
                >
                  Simuler succès
                </Button>
                <Button
                  variant="outline"
                  onClick={() => resolve.mutate("failed")}
                  disabled={resolve.isPending}
                >
                  Simuler échec
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
