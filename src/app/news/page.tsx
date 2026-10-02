import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { NewsExplorer } from "@/components/sections/NewsExplorer";
import { CtaBanner } from "@/components/sections/CtaBanner";

export const metadata: Metadata = {
  title: "Yangiliklar",
  description:
    "202-maktab yangiliklari: tadbirlar, sport musobaqalari, olimpiadalar va ochiq darslar haqidagi rasmiy xronika.",
};

export default function NewsPage() {
  return (
    <>
      <PageHero
        eyebrow="Yangiliklar"
        title={<>Maktab xronikasi</>}
        description="Tadbirlar, musobaqalar, e’lonlar va ochiq darslar — barcha rasmiy xabarlar bir joyda."
        crumbs={[{ label: "Yangiliklar" }]}
        image="/images/news-open-door.jpg"
      />
      <section data-ambient="/images/news-stem.jpg" className="section-pad" aria-label="Yangiliklar ro'yxati">
        <div className="container-x">
          <NewsExplorer />
        </div>
      </section>
      <CtaBanner title="Yangiliklarni o‘tkazib yubormoqchi emasmisiz?" text="Telegram kanalimiz tez orada ishga tushadi — shu sahifani tez-tez tekshirib turing." />
    </>
  );
}
