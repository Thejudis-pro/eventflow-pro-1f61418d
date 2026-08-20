import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Globe, Loader2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/fesa/SiteChrome";
import { sendContactEmail } from "@/lib/email/send-contact-email.functions";

const SUBJECT_OPTIONS = [
  { value: "inscription", label: "Question inscription" },
  { value: "stand", label: "Stand exposant" },
  { value: "partenariat", label: "Partenariat" },
  { value: "autre", label: "Autre" },
] as const;

const inputClass =
  "h-12 w-full rounded-[14px] border border-[#ddd2c2] bg-white px-4 text-[15px] font-medium text-[#0d3d21] outline-none transition placeholder:text-[#7a8b81] focus:border-[#0b7a3c] disabled:opacity-60";
const labelClass = "mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#7a8b81]";

const TITLE = "Contact | FESA 2026";
const DESCRIPTION =
  "Contactez le secrétariat technique du FESA 2026 : WhatsApp, téléphone, e-mail et site de la PAAF.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://www.fesaforum.com/contact" },
    ],
    links: [{ rel: "canonical", href: "https://www.fesaforum.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const subject = String(fd.get("subject") ?? "autre") as "inscription" | "stand" | "partenariat" | "autre";
    const message = String(fd.get("message") ?? "").trim();
    if (!fullName || !email || !message) return;

    setStatus("submitting");
    try {
      await sendContactEmail({
        data: { fullName, email, phone: phone || undefined, subject, message },
      });
      setStatus("success");
      form.reset();
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#0d3d21]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Comment nous joindre</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5a6b62]">
          Une question sur votre inscription, un stand ou un partenariat ? Le secrétariat technique
          du FESA 2026 vous répond.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col divide-y divide-[#e0d6c6] rounded-2xl border border-[#e0d6c6] bg-white px-6">
            <ContactRow icon={MessageCircle} label="WhatsApp — disponible" iconColor="#0b7a3c">
              <p className="text-lg font-bold text-[#0d3d21]">+221 77 477 83 60</p>
              <a
                href="https://wa.me/221774778360"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#0b7a3c] px-5 text-sm font-extrabold text-white transition hover:bg-[#0d3d21]"
              >
                <MessageCircle className="size-4" /> Écrire sur WhatsApp
              </a>
            </ContactRow>

            <ContactRow icon={Phone} label="Appel" iconColor="#42544a">
              <a href="tel:+221774778360" className="block text-lg font-bold text-[#0d3d21] hover:text-[#0b7a3c]">
                +221 77 477 83 60
              </a>
              <a href="tel:+221777306161" className="mt-1 block text-lg font-bold text-[#0d3d21] hover:text-[#0b7a3c]">
                +221 77 730 61 61
              </a>
            </ContactRow>

            <ContactRow icon={Mail} label="Email" iconColor="#42544a">
              <a
                href="mailto:contact@fesaforum.com"
                className="text-lg font-bold text-[#0d3d21] hover:text-[#0b7a3c]"
              >
                contact@fesaforum.com
              </a>
            </ContactRow>

            <ContactRow icon={Globe} label="Site web" iconColor="#42544a">
              <a
                href="https://paafs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-bold text-[#0d3d21] hover:text-[#0b7a3c]"
              >
                www.paafs.org
              </a>
            </ContactRow>
          </div>

          <div className="h-fit rounded-2xl border border-[#e0d6c6] bg-white p-6">
            <h2 className="text-base font-bold text-[#0d3d21]">Le forum</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#0b7a3c]" />
                <div>
                  <dt className="font-semibold text-[#0d3d21]">Dates</dt>
                  <dd className="text-[#5a6b62]">21 &amp; 22 septembre 2026</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#0b7a3c]" />
                <div>
                  <dt className="font-semibold text-[#0d3d21]">Lieu</dt>
                  <dd className="text-[#5a6b62]">CICES, Dakar, Sénégal</dd>
                </div>
              </div>
            </dl>
            <p className="mt-5 border-t border-[#e0d6c6] pt-4 text-xs font-semibold uppercase tracking-wide text-[#a8481a]">
              Organisé par la PAAF
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#e0d6c6] bg-white p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-[#0d3d21]">
            Envoyez-nous un message
          </h2>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Nous vous répondons sous 48h ouvrées.
          </p>

          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className={labelClass} htmlFor="contact-fullName">
                Nom complet
              </label>
              <input
                id="contact-fullName"
                name="fullName"
                type="text"
                required
                disabled={status === "submitting"}
                className={inputClass}
                placeholder="Aïssatou Ndiaye"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                disabled={status === "submitting"}
                className={inputClass}
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="contact-phone">
                Téléphone (optionnel)
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                disabled={status === "submitting"}
                className={inputClass}
                placeholder="77 000 00 00"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="contact-subject">
                Sujet
              </label>
              <select
                id="contact-subject"
                name="subject"
                defaultValue="autre"
                disabled={status === "submitting"}
                className={inputClass}
              >
                {SUBJECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                disabled={status === "submitting"}
                className={`${inputClass} h-auto resize-none py-3`}
                placeholder="Votre message…"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex h-12 items-center gap-2 rounded-[14px] bg-[#a8481a] px-6 text-sm font-extrabold text-white transition hover:bg-[#0d3d21] disabled:opacity-60"
              >
                {status === "submitting" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Envoyer le message
              </button>
              {status === "success" && (
                <p className="mt-3 text-sm font-semibold text-[#0b7a3c]">
                  Merci, votre message a bien été envoyé. Nous revenons vers vous sous 48h.
                </p>
              )}
              {status === "error" && (
                <p className="mt-3 text-sm font-semibold text-[#a8481a]">
                  Une erreur est survenue. Réessayez ou contactez-nous directement par WhatsApp ou
                  téléphone ci-dessus.
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  iconColor,
  children,
}: {
  icon: typeof MessageCircle;
  label: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-6 first:pt-6">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#f2ede3" }}
      >
        <Icon className="size-5" style={{ color: iconColor }} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#7a8b81]">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
