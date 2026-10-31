"use client";

import { useEffect, useState } from "react";
import { revealPage } from "@/lib/page-reveal";

// Long enough for the emblem to draw in once; measured from navigation start.
const MINIMUM_MS = 1400;
const FAILSAFE_MS = 8000;

export default function PageLoader() {
  const [phase, setPhase] = useState<"loading" | "complete" | null>("loading");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      const wait = reduceMotion ? 0 : Math.max(0, MINIMUM_MS - performance.now());
      timers.push(
        window.setTimeout(() => {
          setPhase("complete");
          // Start the hero as the curtain begins to lift, not after it is gone.
          timers.push(window.setTimeout(revealPage, reduceMotion ? 0 : 300));
          timers.push(window.setTimeout(() => setPhase(null), 1200));
        }, wait),
      );
    }

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    timers.push(window.setTimeout(finish, FAILSAFE_MS));

    return () => {
      window.removeEventListener("load", finish);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  if (phase === null) return null;

  return (
    <div
      className="page-loader"
      data-state={phase}
      role="progressbar"
      aria-label="Loading PreBooking"
      aria-valuetext={phase === "complete" ? "Page ready" : "Loading page"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={phase === "complete" ? 100 : undefined}
    >
      <div className="page-loader-mark" aria-hidden="true">
        <svg className="page-loader-ring" viewBox="0 0 100 100">
          <circle className="track" cx="50" cy="50" r="48" />
          <circle className="arc" cx="50" cy="50" r="48" pathLength="100" />
          <circle className="arc arc-accent" cx="50" cy="50" r="48" pathLength="100" />
        </svg>
        <img src="/brand/emblem.webp?v=transparent-1" alt="" width="256" height="256" />
      </div>
      <div className="page-loader-name" aria-hidden="true">
        PreBooking
        <span>Business Connect</span>
      </div>
      <div className="page-loader-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
