"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Status = "idle" | "submitting" | "success" | "validation-error" | "rate-limited" | "server-error";

type FieldErrors = Record<string, string>;

const TOPICS = [
  { value: "admission", label: "Qabul haqida" },
  { value: "school", label: "Maktab haqida" },
  { value: "documents", label: "Hujjatlar" },
  { value: "cooperation", label: "Hamkorlik" },
  { value: "other", label: "Boshqa savol" },
];

/**
 * Contact form — connected to POST /api/v1/contact (Phase 2).
 * Honest states only: idle / submitting / success / validation-error /
 * rate-limited / server-error. No fake success.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string>("");
  const [retryIn, setRetryIn] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clientValidate = (data: FormData): FieldErrors => {
    const errs: FieldErrors = {};
    const name = String(data.get("name") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (name.length < 2) errs.name = "Ismingizni to‘liq kiriting";
    if (contact.length < 5) errs.contact = "Telefon yoki email kiriting";
    if (message.length < 10) errs.message = "Xabar kamida 10 belgidan iborat bo‘lsin";
    return errs;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const honeypot = String(data.get("website") ?? "");
    const payload = {
      name: String(data.get("name") ?? ""),
      contact: String(data.get("contact") ?? ""),
      topic: String(data.get("topic") ?? "admission"),
      message: String(data.get("message") ?? ""),
      website: honeypot,
    };

    const clientErrors = clientValidate(data);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setStatus("validation-error");
      setFormMessage("Iltimos, xatolarni to‘g‘rilang.");
      return;
    }

    setStatus("submitting");
    setFormMessage("");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? "60");
        setRetryIn(retryAfter);
        setStatus("rate-limited");
        setFormMessage(`Juda ko‘p murojaat yuborildi. ${retryAfter} soniyadan keyin qayta urinib ko‘ring.`);
        return;
      }

      const json = (await res.json().catch(() => null)) as
        | { success: boolean; error?: { code: string; message: string; details?: Array<{ field: string; message: string }> } }
        | null;

      if (!json) {
        setStatus("server-error");
        setFormMessage("Serverga ulanishda xatolik. Keyinroq qayta urinib ko‘ring.");
        return;
      }

      if (res.ok && json.success) {
        setStatus("success");
        return;
      }

      if (json.error?.code === "VALIDATION_ERROR" && json.error.details) {
        const fieldErrors: FieldErrors = {};
        for (const d of json.error.details) fieldErrors[d.field] = d.message;
        setErrors(fieldErrors);
        setStatus("validation-error");
        setFormMessage("Ma’lumotlar to‘g‘rilanmadi — tekshirib qayta yuboring.");
        return;
      }

      setStatus("server-error");
      setFormMessage(json.error?.message ?? "Serverda kutilmagan xatolik. Keyinroq qayta urining.");
    } catch {
      setStatus("server-error");
      setFormMessage("Tarmoq xatosi: serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.");
    }
  };

  const startNewMessage = () => {
    setStatus("idle");
    setFormMessage("");
    setErrors({});
  };

  if (status === "success") {
    return (
      <div className="n flex h-full min-h-[420px] flex-col items-center justify-center gap-5 p-10 text-center">
        <span className="tile-ico !h-16 !w-16 !rounded-[22px]">
          <Icon name="check" size={30} />
        </span>
        <h3 className="h3">Xabaringiz qabul qilindi</h3>
        <p className="max-w-[40ch] text-[0.95rem] text-muted">
          Rahmat! Murojaatingiz qayta ishlash navbatiga qo‘shildi — ma’muriyat javob berishi mumkin bo‘lgan
          kanallar orqali aloqaga chiqadi.
        </p>
        <button type="button" className="btn btn-ghost" onClick={startNewMessage}>
          Yana bir xabar yozish
        </button>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form className="n p-6 sm:p-9" onSubmit={onSubmit} noValidate aria-label="Murojaat formasi">
      {/* honeypot — hidden from humans, catches naive bots */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Veb-sayt
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

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
            maxLength={80}
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
            maxLength={120}
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
          maxLength={2000}
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby={errors.message ? "cf-message-err" : undefined}
        />
        <p className="field-error" id="cf-message-err" data-show={!!errors.message}>{errors.message}</p>
      </div>

      {/* honest API states */}
      <div role="alert" aria-live="polite">
        {status === "rate-limited" ? (
          <p className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-[color:var(--accent-soft)] p-4 text-[0.86rem] font-semibold leading-snug text-[color:var(--accent-ink)]">
            <Icon name="alert" size={17} className="mt-0.5 flex-none" />
            {formMessage}
          </p>
        ) : null}
        {status === "server-error" ? (
          <p className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-[rgba(179,38,30,0.1)] p-4 text-[0.86rem] font-semibold leading-snug text-[color:var(--error)]">
            <Icon name="alert" size={17} className="mt-0.5 flex-none" />
            {formMessage}
          </p>
        ) : null}
        {status === "validation-error" && Object.keys(errors).length === 0 ? (
          <p className="field-error mt-5" data-show="true">{formMessage}</p>
        ) : null}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary min-w-[190px]" disabled={submitting || (status === "rate-limited" && retryIn > 0)}>
          {submitting ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Yuborilmoqda...
            </>
          ) : status === "rate-limited" ? (
            <>Iltimos, kutib turing</>
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
