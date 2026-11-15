import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
export default function UsgLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="usg">
      <ErrorBoundary fallbackHref="/usg">{children}</ErrorBoundary>
    </AppShell>
  );
}
