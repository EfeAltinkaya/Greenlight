import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="club">
      <ErrorBoundary fallbackHref="/club">{children}</ErrorBoundary>
    </AppShell>
  );
}
