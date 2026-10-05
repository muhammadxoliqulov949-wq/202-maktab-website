"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

type GuideGoal = {
  id: "prepare" | "plan" | "explore";
  icon: IconName;
  label: string;
  title: string;
  description: string;
  steps: string[];
  tip: string;
};

const GOALS: GuideGoal[] = [
  {
    id: "prepare",
    icon: "book",
    label: "Darsga tayyorlanish",
    title: "Bugungi dars uchun 35 daqiqalik start",
    description: "Kichik, aniq qadamlar bilan boshlang — mukammallikni emas, muntazamlikni tanlang.",
    steps: ["Mavzuni va bitta aniq savolni yozib qo‘ying.", "25 daqiqa diqqat bilan o‘qing yoki mashq bajaring.", "5 daqiqa tanaffus qilib, keyingi qadamni belgilang."],
    tip: "Ziyoning eslatmasi: avval eng qiyin savolga 10 daqiqa ajrating — boshlashning o‘zi katta yutuq.",
  },
  {
    id: "plan",
    icon: "calendar",
    label: "Haftalik reja",
    title: "Haftani uch ustuvor vazifa bilan tuzing",
    description: "Har kuni ozgina, ammo barqaror harakat qilish katta maqsadga olib boradi.",
    steps: ["Bu hafta uchun 3 ta muhim fan yoki mavzuni tanlang.", "Har biri uchun ikki marta 25 daqiqalik vaqt belgilang.", "Juma kuni 10 daqiqa ajratib, nimalar o‘xshaganini yozing."],
    tip: "Ziyoning eslatmasi: rejangizda bo‘sh vaqt qoldiring — dam olish ham o‘qishning bir qismi.",
  },
  {
    id: "explore",
    icon: "atom",
    label: "Qiziqishni topish",
    title: "Bir qiziqishdan boshlanadigan izlanish",
    description: "O‘zingizga yoqqan mavzuni toping va uni kichik tajriba orqali sinab ko‘ring.",
    steps: ["Sizni qiziqtiradigan bitta savolni tanlang.", "U haqida 15 daqiqa ma’lumot yoki video izlang.", "Bilganingizni uch jumlada do‘stingizga yoki daftaringizga tushuntiring."],
    tip: "Ziyoning eslatmasi: “nima uchun?” degan savolni ko‘proq bering — qiziqish shu yerdan boshlanadi.",
  },
];

/** A small, honest first-step planner — no fictional chat or unsupported AI claims. */
export function AiStudyGuide() {
  const [activeId, setActiveId] = useState<GuideGoal["id"]>("prepare");
  const active = GOALS.find((goal) => goal.id === activeId) ?? GOALS[0];

  return (
    <div className="ai-study-guide n">
      <div className="ai-study-guide-head">
        <div>
          <p className="eyebrow">Ziyo bilan birinchi qadam</p>
          <h2 className="h2 mt-4 max-w-[20ch]">Bugun nimani boshlaymiz?</h2>
        </div>
        <p className="max-w-[38ch] text-[0.95rem] leading-relaxed text-muted">
          Yo‘nalishni tanlang — Ziyo sizga hozirning o‘zida bajarish mumkin bo‘lgan sodda reja beradi.
        </p>
      </div>

      <div className="ai-study-guide-tabs" role="group" aria-label="O‘qish maqsadini tanlang">
        {GOALS.map((goal) => {
          const selected = goal.id === activeId;
          return (
            <button
              key={goal.id}
              type="button"
              aria-pressed={selected}
              className={`ai-study-guide-tab ${selected ? "is-active" : ""}`}
              onClick={() => setActiveId(goal.id)}
            >
              <span className="ai-study-guide-tab-icon">
                <Icon name={goal.icon} size={20} />
              </span>
              <span>{goal.label}</span>
            </button>
          );
        })}
      </div>

      <div className="ai-study-guide-plan" aria-live="polite">
        <div className="ai-study-guide-plan-title">
          <span className="ai-study-guide-plan-icon">
            <Icon name={active.icon} size={24} />
          </span>
          <div>
            <p className="kicker">Ziyoning tavsiyasi</p>
            <h3 className="mt-1 font-display text-[1.3rem] font-extrabold tracking-tight text-ink">{active.title}</h3>
          </div>
        </div>
        <p className="mt-4 max-w-[60ch] text-[0.96rem] leading-relaxed text-muted">{active.description}</p>
        <ol className="ai-study-guide-steps">
          {active.steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <p className="ai-study-guide-tip">
          <Icon name="star" size={16} />
          {active.tip}
        </p>
      </div>
    </div>
  );
}
