import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Schibsted_Grotesk, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/Motion";

const display = Schibsted_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["500"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Greenlight: Your Highway to Capital",
  description: "Greenlight: Your Highway to Capital. Club funding at USC, checked against every USG rule before you send it, with the rest found from USC and sponsors on one ledger.",
  icons: { icon: "/favicon.png", apple: "/greenlight-mark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${serif.variable}`}>
      <body><NavProgress>{children}</NavProgress></body>
    </html>
  );
}
