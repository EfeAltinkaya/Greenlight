import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/Motion";

const display = Schibsted_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["500"] });

export const metadata: Metadata = {
  title: { default: "Greenlight · USG funding for USC clubs", template: "%s · Greenlight" },
  description: "Build a USG funding request that is checked against the 2026-27 guidelines before you submit. Reviewers get every application already checked.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body><NavProgress>{children}</NavProgress></body>
    </html>
  );
}
