"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Offers live under Sponsors > Offers. */
export default function OffersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/club/sponsors?tab=offers");
  }, [router]);
  return <p className="small muted" style={{ padding: 24 }}>Opening Sponsors · Offers…</p>;
}
