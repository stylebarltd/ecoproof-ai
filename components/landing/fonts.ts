import { Bebas_Neue, Fraunces, Nunito } from "next/font/google";

// The landing page's type (design brief): a characterful serif for headlines, a rounded sans for body, a condensed face inside stamps only.
export const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces", display: "swap" });
export const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
export const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas", display: "swap" });
export const journalFonts = `${fraunces.variable} ${nunito.variable} ${bebas.variable}`;
