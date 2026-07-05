"use client";

import { Component, type ReactNode } from "react";

/**
 * CardErrorBoundary — wraps a single Stories card so a render crash in one card
 * (e.g. a future malformed exercise `data` shape hitting the components'
 * unguarded destructuring) degrades to a friendly "skip" fallback instead of
 * white-screening the whole lesson. There is no other error boundary in the
 * app, and the exercise components do `data.field.map(...)` with no guards, so
 * this is the safety net for that whole class.
 *
 * Reset: the parent renders each card inside a motion.div keyed by `current`,
 * so navigating to another card remounts a fresh boundary automatically — no
 * manual reset needed.
 */
interface Props {
  children: ReactNode;
  onNext: () => void;
}
interface State {
  hasError: boolean;
}

export class CardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[CardErrorBoundary] card render failed", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-5">
        <span className="text-4xl">🌸</span>
        <p className="text-base font-semibold text-ink">
          Ối, phần này hơi trục trặc
        </p>
        <p className="text-sm text-ink-soft">
          Không sao đâu Heo — mình bỏ qua và học tiếp nha.
        </p>
        <button
          type="button"
          data-no-nav="true"
          onClick={this.props.onNext}
          className="mt-2 px-6 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
        >
          Tiếp tục 🌸
        </button>
      </div>
    );
  }
}
