import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Schibsted_Grotesk, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/Motion";

const display = Schibsted_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["500"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Greenlight: club funding at USC, checked, routed and recorded.",
  description: "Greenlight writes your USG request, checks it against every rule before you send it, finds the rest from USC and sponsors, and keeps every dollar on one ledger.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${serif.variable}`}>
      <body><NavProgress>{children}</NavProgress></body>
    </html>
  );
}
