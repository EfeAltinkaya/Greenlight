"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, LogIn } from "lucide-react";
import { useSession } from "@/lib/session";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const deskFor = (role: string | null | undefined) => (role === "usg" ? "/usg" : role === "sponsor" ? "/sponsor" : "/club");

/** The hero headline types itself out once. The full sentence sits underneath (invisible) so nothing shifts. */
export function TypedHeadline({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
    }, 42);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  const shown = reduce ? text.length : n;
  return (
    <h1 className="typed" aria-label={text}>
      <span className="typed-ghost" aria-hidden="true">{text}</span>
      <span className="typed-live" aria-hidden="true">
        {text.slice(0, shown)}
        <span className={"caret" + (shown >= text.length ? " done" : "")} />
      </span>
    </h1>
  );
}

/** A section that rises into place the first time it scrolls into view. */
export function ScrollIn({ children, delay = 0, className, id, style }: { children: React.ReactNode; delay?: number; className?: string; id?: string; style?: React.CSSProperties }) {
  const reduce = useReducedMotion();
  // Reduced motion: never hide text behind opacity 0.
  if (reduce) {
    return (
      <div id={id} className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      id={id}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px 20% 0px" }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Top-right of the landing page: sign in, and one way into the tool. */
export function NavActions() {
  const s = useSession();
  if (s.user) {
    return <Link href={deskFor(s.user.role)} className="btn btn-primary nav-btn">Go to your desk<ArrowRight /></Link>;
  }
  return (
    <>
      {s.enabled && <Link href="/login" className="btn btn-ghost nav-btn"><LogIn />Sign in or create account</Link>}
      <Link href="/club" className="btn btn-primary nav-btn">Explore the tool<ArrowRight /></Link>
    </>
  );
}

/** "Start a request" sends people without an account to sign up first, then straight on to the new request. */
export function StartRequest({ className = "btn btn-primary btn-lg" }: { className?: string }) {
  const s = useSession();
  const router = useRouter();
  const href = !s.enabled || s.user ? "/club/new" : "/login?mode=signup&next=/club/new";
  return (
    <Link href={href} className={className} onClick={(e) => { if (s.enabled && !s.ready) { e.preventDefault(); router.push(href); } }}>
      Start a request<ArrowRight />
    </Link>
  );
}
