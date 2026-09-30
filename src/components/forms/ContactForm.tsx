"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Status = "idle" | "sending" | "sent" | "error";

const TOPICS = [
  { value: "admission", label: "Qabul haqida" },
  { value: "school", label: "Maktab haqida" },
  { value: "documents", label: "Hujjatlar" },
  { value: "cooperation", label: "Hamkorlik" },
  { value: "other", label: "Boshqa savol" },
];

/**
 * Contact form — UI/UX only in Phase 1.
 * Client-side validation + honest prototype feedback (no fake server calls).
 * Phase-4 will POST this to the real endpoint.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const nextErrors: Record<string, string> = {};
    const name = String(data.get("name") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (name.length < 2) nextErrors.name = "Ismingizni to‘liq kiriting";
    if (contact.length < 5) nextErrors.contact = "Telefon yoki email kiriting";
    if (message.length < 10) nextErrors.message = "Xabar kamida 10 belgidan iborat bo‘lsin";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("sending");
    // prototype: no backend — simulate a short processing pause, then confirm honestly
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus("sent");
      form.reset();
    }, 900);
  };

  if (status === "sent") {
    return (
      <div className="n flex h-full min-h-[420px] flex-col items-center justify-center gap-5 p-10 text-center">
        <span className="tile-ico !h-16 !w-16 !rounded-[22px]">
          <Icon name="check" size={30} />
        </span>
        <h3 className="h3">Xabaringiz qabul qilindi</h3>
        <p className="max-w-[40ch] text-[0.95rem] text-muted">
          Rahmat! <b className="text-ink">Prototip rejimida:</b> hozircha xabar yuborilmadi — forma fagat
          namoyish uchun. Haqiqiy yuborish 4-bosqichda ulanadi.
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus("idle")}>
          Yana bir xabar yozish
        </button>
      </div>
    );
  }

  return (
    <form className="n p-6 sm:p-9" onSubmit={onSubmit} noValidate aria-label="Murojaat formasi">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-2 block text-[0.86rem] font-bold">
            Ismingiz <span className="text-[color:var(--accent-ink)]">*</span>
          </label>
          <input
            id="cf-name"
            name="name"
            type="text"
            className="field"
            placeholder="Masalan: Aziza"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? "cf-name-err" : undefined}
          />
          <p className="field-error" id="cf-name-err" data-show={!!errors.name}>{errors.name}</p>
        </div>
        <div>
          <label htmlFor="cf-contact" className="mb-2 block text-[0.86rem] font-bold">
            Telefon yoki email <span className="text-[color:var(--accent-ink)]">*</span>
          </label>
          <input
            id="cf-contact"
            name="contact"
            type="text"
            className="field"
            placeholder="+998 __ ___-__-__ yoki email"
            autoComplete="tel"
            aria-invalid={errors.contact ? "true" : undefined}
            aria-describedby={errors.contact ? "cf-contact-err" : undefined}
          />
          <p className="field-error" id="cf-contact-err" data-show={!!errors.contact}>{errors.contact}</p>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="cf-topic" className="mb-2 block text-[0.86rem] font-bold">
          Murojaat mavzusi
        </label>
        <select id="cf-topic" name="topic" className="field" defaultValue="admission">
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor="cf-message" className="mb-2 block text-[0.86rem] font-bold">
          Xabaringiz <span className="text-[color:var(--accent-ink)]">*</span>
        </label>
        <textarea
          id="cf-message"
          name="message"
          rows={5}
          className="field resize-y"
          placeholder="Savolingizni batafsil yozing..."
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby={errors.message ? "cf-message-err" : undefined}
        />
        <p className="field-error" id="cf-message-err" data-show={!!errors.message}>{errors.message}</p>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary min-w-[190px]" disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Yuborilmoqda...
            </>
          ) : (
            <>
              Xabar yuborish
              <Icon name="arrow-up-right" size={16} className="btn-ar-diag" />
            </>
          )}
        </button>
        <p className="max-w-[36ch] text-[0.78rem] leading-snug text-faint">
          Formani yuborish bilan ma’lumotlaringiz faqat murojaatingizga javob berish uchun ishlatilishiga rozilik
          bildirasiz.
        </p>
      </div>
    </form>
  );
}
