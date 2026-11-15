"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Deals live under Sponsors > Deals. Detail routes stay at /club/deals/[id]. */
export default function DealsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/club/sponsors?tab=deals");
  }, [router]);
  return <p className="small muted" style={{ padding: 24 }}>Opening Sponsors · Deals…</p>;
}
