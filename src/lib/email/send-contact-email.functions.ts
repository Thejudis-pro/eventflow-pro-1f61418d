import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUBJECT_LABELS = {
  inscription: "Question inscription",
  stand: "Stand exposant",
  partenariat: "Partenariat",
  autre: "Autre",
} as const;

const inputSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  subject: z.enum(["inscription", "stand", "partenariat", "autre"]),
  message: z.string().trim().min(1),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Contact page form -> contact@fesaforum.com, via Resend, reply-to set to
 * the sender so replying in an inbox goes straight back to them. */
export const sendContactEmail = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const subjectLabel = SUBJECT_LABELS[data.subject];
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #201e1d; line-height: 1.6;">
        <p><strong>Nom :</strong> ${escapeHtml(data.fullName)}</p>
        <p><strong>Email :</strong> ${escapeHtml(data.email)}</p>
        ${data.phone ? `<p><strong>Téléphone :</strong> ${escapeHtml(data.phone)}</p>` : ""}
        <p><strong>Sujet :</strong> ${escapeHtml(subjectLabel)}</p>
        <p><strong>Message :</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
      </div>
    `.trim();
    const text = [
      `Nom : ${data.fullName}`,
      `Email : ${data.email}`,
      ...(data.phone ? [`Téléphone : ${data.phone}`] : []),
      `Sujet : ${subjectLabel}`,
      ``,
      `Message :`,
      data.message,
    ].join("\n");

    try {
      const { sendEmail } = await import("./resend.server");
      await sendEmail({
        to: "contact@fesaforum.com",
        subject: `[FESA 2026 Contact] ${subjectLabel}`,
        html,
        text,
        replyTo: data.email,
      });
    } catch (error) {
      console.error("[contact] send failed", error);
      throw new Error("Le message n'a pas pu être envoyé.");
    }
  });
