import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Intro } from "@/components/sections/Intro";
import { Stats } from "@/components/sections/Stats";
import { EducationGrid } from "@/components/sections/EducationGrid";
import { LifeMosaic } from "@/components/sections/LifeMosaic";
import { FacilitiesStory } from "@/components/sections/FacilitiesStory";
import { TeamSection } from "@/components/sections/TeamSection";
import { NewsSection } from "@/components/sections/NewsSection";
import { QuickAccess } from "@/components/sections/QuickAccess";
import { Location } from "@/components/sections/Location";
import { FinalCta } from "@/components/sections/FinalCta";

/**
 * HOMEPAGE — a paced visual story in 11 movements.
 * All content flows from src/data/* (DB-ready for Phase 3).
 */
export default function HomePage() {
  return (
    <>
      {/* 01 — cinematic hero */}
      <Hero />
      {/* values strip */}
      <Marquee />
      {/* 02 — introduction */}
      <Intro />
      {/* 03 — school in numbers */}
      <div className="section-pad-tight">
        <Stats />
      </div>
      {/* 04 — education experience */}
      <EducationGrid />
      {/* 05 — immersive school life */}
      <LifeMosaic />
      {/* 06 — learning environment */}
      <FacilitiesStory />
      {/* 07 — teachers */}
      <TeamSection />
      {/* 08 — news & events */}
      <NewsSection />
      {/* 09 — quick access */}
      <QuickAccess />
      {/* 10 — location */}
      <Location />
      {/* 11 — final CTA */}
      <FinalCta />
    </>
  );
}
