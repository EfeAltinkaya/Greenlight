import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="sponsor">
      <ErrorBoundary fallbackHref="/sponsor">{children}</ErrorBoundary>
    </AppShell>
  );
}
