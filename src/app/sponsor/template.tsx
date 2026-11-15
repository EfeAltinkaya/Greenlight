import { PageTransition } from "@/components/Motion";

// A template remounts on every navigation, so each tab fades in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
