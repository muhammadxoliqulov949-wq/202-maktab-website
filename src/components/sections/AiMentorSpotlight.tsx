import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";

const GUIDE_POINTS = [
  "O‘qishni kichik va aniq qadamlarga bo‘lish",
  "Fanlar hamda maktab xizmatlariga tez yo‘l topish",
  "Maqsad qo‘yish va muntazam mashq qilishga ruhlantirish",
];

/** Homepage introduction to Ziyo, the school's AI learning companion. */
export function AiMentorSpotlight() {
  return (
    <section className="section-pad" aria-labelledby="ziyo-title">
      <div className="container-x">
        <Reveal>
          <div className="ai-mentor-spotlight">
            <div className="ai-mentor-grid">
              <div className="ai-mentor-copy">
                <p className="eyebrow">
                  <span className="sec-index mr-1">03</span>
                  202 AI yo‘ldoshi
                </p>
                <h2 id="ziyo-title" className="h2 mt-5 max-w-[17ch]">
                  Tanishib oling: <em className="em-accent">Ziyo</em> — o‘quvchining yonidagi aqlli yo‘l ko‘rsatuvchi.
                </h2>
                <p className="lead mt-6 max-w-[55ch]">
                  Ziyo o‘quvchini izlanishga undaydi, o‘qish yo‘lini tartiblaydi va kerakli sahifaga bir qadamda olib boradi.
                  U har bir bolaga mustaqil o‘rganishni odat qilishda hamroh bo‘lish uchun yaratilgan.
                </p>

                <ul className="mt-7 grid gap-3" aria-label="Ziyo yordam beradigan yo‘nalishlar">
                  {GUIDE_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-[0.93rem] font-semibold leading-relaxed text-muted">
                      <span className="ai-mentor-check mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full">
                        <Icon name="check" size={14} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href="/ai-yordamchi" className="btn btn-primary">
                    Ziyo bilan boshlash
                    <Icon name="arrow-right" size={17} className="btn-ar" />
                  </Link>
                  <Link href="/education" className="btn btn-ghost">
                    Ta’lim yo‘nalishlari
                  </Link>
                </div>
              </div>

              <div className="ai-mentor-visual" aria-label="Ziyo — 202-maktabning AI yo‘ldoshi">
                <span className="ai-mentor-orbit ai-mentor-orbit-one" aria-hidden="true" />
                <span className="ai-mentor-orbit ai-mentor-orbit-two" aria-hidden="true" />
                <Image
                  src="/images/ai-mentor-owl.webp"
                  alt="Ziyo — o‘quvchiga yo‘l ko‘rsatadigan sun’iy intellekt yo‘ldoshi"
                  fill
                  sizes="(min-width: 1024px) 44vw, 92vw"
                  className="ai-mentor-image object-cover object-center"
                />
                <div className="ai-mentor-status">
                  <span className="ai-mentor-status-dot" aria-hidden="true" />
                  <span>
                    <b>Ziyo yoningizda</b>
                    <small>O‘qish uchun yoningizda</small>
                  </span>
                </div>
                <div className="ai-mentor-label ai-mentor-label-top">
                  <Icon name="route" size={16} />
                  Yo‘l xaritasi
                </div>
                <div className="ai-mentor-label ai-mentor-label-bottom">
                  <Icon name="graduation" size={16} />
                  Birga o‘rganamiz
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
