"use client";

import React, { useEffect, useState } from "react";

/**
 * JourneyHud — a small handwritten "scroll to explore" hint that fades in once
 * you've stepped through the door and fades out after the first scroll.
 */
export default function JourneyHud({ visible }: { visible: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const onWheel = () => setScrolled(true);
    window.addEventListener("wheel", onWheel, { passive: true, once: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [visible]);

  const show = visible && !scrolled;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        bottom: "2.2rem",
        left: "50%",
        transform: `translateX(-50%) translateY(${show ? 0 : 12}px)`,
        opacity: show ? 1 : 0,
        transition: "opacity 0.6s ease, transform 0.6s ease",
        pointerEvents: "none",
        textAlign: "center",
        fontFamily: "var(--font-caveat), 'Caveat', cursive",
        color: "#2b2b2b",
        zIndex: 40,
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>scroll to explore</div>
      <div style={{ fontSize: "0.95rem", letterSpacing: "0.12em", color: "#6a6a6a", marginTop: "0.1rem" }}>
        journey · skills · projects · contact
      </div>
      <div style={{ fontSize: "1.8rem", animation: "journey-bob 1.4s ease-in-out infinite" }}>↓</div>
      <style>{`@keyframes journey-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(6px) } }`}</style>
    </div>
  );
}
