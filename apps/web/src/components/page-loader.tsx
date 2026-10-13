"use client";

import { useEffect, useState } from "react";

export default function PageLoader() {
  const [phase, setPhase] = useState<"loading" | "complete" | null>("loading");

  useEffect(() => {
    let exitTimer: number | undefined;
    function finish() {
      setPhase("complete");
      exitTimer = window.setTimeout(() => setPhase(null), 320);
    }

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(exitTimer);
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
      <div className="page-loader-trace" aria-hidden="true" />
    </div>
  );
}
