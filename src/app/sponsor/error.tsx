"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function SponsorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Sponsor route error:", error);
  }, [error]);
  return (
    <div className="card empty" role="alert">
      <strong>This page hit an error</strong>
      <span className="muted small">Reload, or go back to your offers. The rest of Greenlight still works.</span>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
        <Link className="btn btn-primary" href="/sponsor">
          Back to offers
        </Link>
      </div>
    </div>
  );
}
