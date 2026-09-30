import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://202-maktab.uz"),
  title: {
    default: "202-maktab — Bilim, tarbiya va kelajak bir maskanda",
    template: "%s | 202-maktab",
  },
  description:
    "202-sonli umumiy o‘rta ta’lim maktabi — Chilonzor tumani, Toshkent. Ta’lim, maktab hayoti, yangiliklar va qabul haqida rasmiy ma’lumot.",
  keywords: ["202-maktab", "Chilonzor", "Toshkent maktab", "umumiy o'rta ta'lim", "maktab rasmiy sayt"],
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    siteName: "202-maktab",
    title: "202-maktab — Bilim, tarbiya va kelajak bir maskanda",
    description: "202-sonli umumiy o‘rta ta’lim maktabi rasmiy sayti.",
    images: [{ url: "/images/hero.jpg", width: 1792, height: 1008, alt: "202-maktab binosi" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0ede6" },
    { media: "(prefers-color-scheme: dark)", color: "#101a2c" },
  ],
  width: "device-width",
  initialScale: 1,
};

/** Restores the saved theme before paint (no FOUC) + marks html.js for reveal gating. */
const themeScript = `(function(){try{var t=localStorage.getItem("m202-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();`;

const jsFlagScript = `document.documentElement.classList.add("js");`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: jsFlagScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-[color:var(--primary)] focus:px-5 focus:py-3 focus:font-bold focus:text-[color:var(--primary-contrast)]"
        >
          Asosiy kontentga o‘tish
        </a>
        <Navbar />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
