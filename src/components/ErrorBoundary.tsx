"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";

type Props = { children: ReactNode; fallbackHref?: string };
type State = { error: Error | null };

/** Catches render errors so one page cannot blank the whole shell. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Greenlight page error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const href = this.props.fallbackHref ?? "/";
    return (
      <div className="card empty" role="alert">
        <strong>This page hit an error</strong>
        <span className="muted small">Reload, or go back and try another screen. The rest of Greenlight still works.</span>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <Link className="btn btn-primary" href={href}>
            Leave this page
          </Link>
        </div>
      </div>
    );
  }
}
