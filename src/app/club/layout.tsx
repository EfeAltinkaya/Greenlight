import { AppShell } from "@/components/AppShell";
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="club">{children}</AppShell>;
}
