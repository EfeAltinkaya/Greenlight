import { AppShell } from "@/components/AppShell";
export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="sponsor">{children}</AppShell>;
}
