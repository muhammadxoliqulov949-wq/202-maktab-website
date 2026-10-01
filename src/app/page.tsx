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
import { StoryRail, type StoryChapter } from "@/components/sections/StoryRail";

/** Story chapters — the homepage reads as an 11-act story while scrolling. */
const CHAPTERS: StoryChapter[] = [
  { id: "bob-hero", label: "Bosh sahifa" },
  { id: "bob-tanishuv", label: "Tanishuv" },
  { id: "bob-raqamlar", label: "Raqamlarda" },
  { id: "bob-talim", label: "Ta’lim" },
  { id: "bob-hayot", label: "Maktab hayoti" },
  { id: "bob-inshootlar", label: "Inshootlar" },
  { id: "bob-jamoa", label: "Jamoa" },
  { id: "bob-yangiliklar", label: "Yangiliklar" },
  { id: "bob-havolalar", label: "Tez havolalar" },
  { id: "bob-manzil", label: "Manzil" },
  { id: "bob-aloqa", label: "Bog‘lanish" },
];

/**
 * HOMEPAGE — a paced visual story in 11 acts.
 * All content flows from src/data/* (DB-ready for Phase 3).
 * Native scrolling throughout; motion layers on top (no hijacking).
 */
export default function HomePage() {
  return (
    <>
      {/* 01 — cinematic hero */}
      <Hero />
      {/* values strip */}
      <Marquee />
      {/* 02 — introduction */}
      <div id="bob-tanishuv">
        <Intro />
      </div>
      {/* 03 — school in numbers */}
      <div id="bob-raqamlar" className="section-pad-tight">
        <Stats />
      </div>
      {/* 04 — education experience */}
      <div id="bob-talim">
        <EducationGrid />
      </div>
      {/* 05 — immersive school life */}
      <div id="bob-hayot">
        <LifeMosaic />
      </div>
      {/* 06 — learning environment */}
      <div id="bob-inshootlar">
        <FacilitiesStory />
      </div>
      {/* 07 — teachers */}
      <div id="bob-jamoa">
        <TeamSection />
      </div>
      {/* 08 — news & events */}
      <div id="bob-yangiliklar">
        <NewsSection />
      </div>
      {/* 09 — quick access */}
      <div id="bob-havolalar">
        <QuickAccess />
      </div>
      {/* 10 — location */}
      <div id="bob-manzil">
        <Location />
      </div>
      {/* 11 — final CTA */}
      <div id="bob-aloqa">
        <FinalCta />
      </div>

      <StoryRail items={CHAPTERS} />
    </>
  );
}
