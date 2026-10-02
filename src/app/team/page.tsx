import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { TeamExplorer } from "@/components/sections/TeamExplorer";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Jamoa",
  description:
    "202-maktab pedagoglar jamoasi: rahbariyat, o‘qituvchilar va ma’muriyat. Filtrlar va qidiruv bilan tanishing.",
};

export default function TeamPage() {
  return (
    <>
      <PageHero
        eyebrow="Jamoa"
        title={<>Ustozlar — maktabning yuragi</>}
        description="Rahbariyat, o‘qituvchilar va qo‘llab-quvvatlash jamoasi. Qidiruv va fan bo‘yicha filtr bilan tanishing."
        crumbs={[{ label: "Jamoa" }]}
        image="/images/edu-quality.jpg"
      />

      <section data-ambient="/images/edu-inclusive.jpg" className="section-pad" aria-label="Jamoa a'zolari">
        <div className="container-x">
          <Reveal>
            <div className="mb-10 flex flex-wrap items-center gap-4">
              <span className="proto-note">
                <Icon name="alert" size={15} />
                Prototip ro‘yxat — ismlar va lavozimlar namunaviy
              </span>
            </div>
          </Reveal>
          <TeamExplorer />
        </div>
      </section>

      <CtaBanner
        title="Bizning jamoaga qo‘shilmoqchimisiz?"
        text="Bo‘sh o‘rinlar va malaka talablari haqida ma’muriyat bilan bog‘laning."
      />
    </>
  );
}
