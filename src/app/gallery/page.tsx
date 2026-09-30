import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { GalleryExplorer } from "@/components/sections/GalleryExplorer";
import { CtaBanner } from "@/components/sections/CtaBanner";

export const metadata: Metadata = {
  title: "Galereya",
  description: "202-maktab hayotidan lavhalar: darslar, sport, kutubxona, tadbirlar va ijod to‘garaklari.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Galereya"
        title={<>Maktab hayoti ko‘zlar bilan</>}
        description="Rasmlar va videolavhalar — albomlar bo‘yicha tartiblangan. Bosing va to‘liq ekranda ko‘ring."
        crumbs={[{ label: "Galereya" }]}
        image="/images/life-ijod.jpg"
      />
      <section className="section-pad" aria-label="Galereya media">
        <div className="container-x">
          <GalleryExplorer />
        </div>
      </section>
      <CtaBanner title="Galereya yangilanib turadi" text="Maktab tadbirlaridan yangi lavhalar shu sahifada e’lon qilinadi." />
    </>
  );
}
