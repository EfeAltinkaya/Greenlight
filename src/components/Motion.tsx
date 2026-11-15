"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** Fades and lifts a page in when you switch tabs. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      style={{ display: "grid", gap: 28, gridTemplateColumns: "minmax(0, 1fr)" }}
    >
      {children}
    </motion.div>
  );
}

/** Same motion for a panel that changes inside a page (request steps, opened details). */
export function Reveal({ children, k, gap = 20 }: { children: React.ReactNode; k: string; gap?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={k}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      style={{ display: "grid", gap, gridTemplateColumns: "minmax(0, 1fr)" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A thin cardinal bar at the top of the window from the moment you click a link until the next page shows,
 * so every click gets an answer even when the page takes a moment.
 */
export function NavProgress({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [from, setFrom] = useState<string | null>(null);
  // Clear the bar whenever the page changes, however it changed (link, back button, code).
  const [seen, setSeen] = useState(path);
  if (seen !== path) {
    setSeen(path);
    setFrom(null);
  }
  // Code-driven navigation (clicking a table row) announces itself with this event.
  useEffect(() => {
    const on = () => setFrom(window.location.pathname);
    window.addEventListener("greenlight:nav", on);
    return () => window.removeEventListener("greenlight:nav", on);
  }, []);
  const loading = from !== null && from === path;
  return (
    <div
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
        const url = new URL(a.href, location.href);
        if (url.origin === location.origin && url.pathname !== location.pathname) setFrom(path);
      }}
      style={{ display: "contents" }}
    >
      <span className={"nav-progress" + (loading ? " on" : "")} aria-hidden="true" />
      {children}
    </div>
  );
}

/** Navigate from code with the same progress bar as a link click. */
export function announceNav() {
  window.dispatchEvent(new Event("greenlight:nav"));
}
