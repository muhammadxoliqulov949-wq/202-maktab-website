import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { NAV_LINKS } from "@/data/nav";

export const metadata = { title: "Sahifa topilmadi" };

export default function NotFound() {
  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <Image src="/images/life-muhit.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,18,33,0.88)] via-[rgba(10,18,33,0.8)] to-[rgba(10,18,33,0.92)]" />
      </div>

      <div className="container-x relative py-28 text-center">
        <p className="eyebrow eyebrow-light justify-center">Xatolik 404</p>
        <h1 className="mx-auto mt-6 max-w-[16ch] font-display text-[clamp(3rem,10vw,6rem)] font-extrabold leading-none tracking-tight text-white">
          Bu sahifa <em className="em-accent-on-dark">sinfda emas.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-[44ch] text-[1rem] leading-relaxed text-white/75">
          Siz izlagan manzil topilmadi yoki o‘chirilgan. Bosh sahifaga qayting yoki kerakli bo‘limni tanlang.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn btn-accent btn-lg">
            Bosh sahifaga
            <Icon name="arrow-right" size={18} className="btn-ar" />
          </Link>
          <Link href="/contact#form" className="btn btn-lg text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.4)] hover:bg-white/10">
            Muammo haqida xabar berish
          </Link>
        </div>

        <nav aria-label="Asosiy bo'limlar" className="mx-auto mt-14 flex max-w-[640px] flex-wrap justify-center gap-2.5">
          {NAV_LINKS.filter((l) => l.href !== "/").map((l) => (
            <Link key={l.href} href={l.href} className="chip !bg-white/10 !text-white backdrop-blur-sm transition-colors hover:!bg-white/20">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
