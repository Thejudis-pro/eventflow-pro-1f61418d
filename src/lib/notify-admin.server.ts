/**
 * Shared "something automatic just failed silently" alert. Backs both the
 * PayTech webhook (confirmPayment throwing -- e.g. a secret drift between
 * INTERNAL_PAYMENT_SECRET and the database, which is exactly what left two
 * real paid registrations stuck on "pending" until a customer complained)
 * and the registration-confirmation-email send path. Never throws -- an
 * alert failing here must never mask or replace the original error.
 */
export async function notifyAdmin(params: { subject: string; lines: string[] }): Promise<void> {
  try {
    const { sendEmail } = await import("./email/resend.server");
    await sendEmail({
      to: "contact@fesaforum.com",
      subject: params.subject,
      text: params.lines.join("\n"),
      html: params.lines.map((l) => `<p>${l}</p>`).join(""),
    });
  } catch (error) {
    console.error("[notify-admin] failed to send alert", error);
  }
}
