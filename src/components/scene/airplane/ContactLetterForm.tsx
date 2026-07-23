"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";

import { projectUI } from "@/data/portfolio";

const inkColor = "#111111";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255, 255, 255, 0.78)",
  border: "1.5px solid rgba(17, 17, 17, 0.72)",
  borderRadius: 5,
  padding: "7px 9px",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.55)",
  fontFamily: "var(--font-patrick), 'Patrick Hand', var(--font-caveat), cursive",
  fontSize: 14,
  color: inkColor,
  outline: "none",
  resize: "none",
};

export type LetterFields = {
  email: string;
  subject: string;
  message: string;
};

/**
 * ContactLetterForm — the handwriting-styled form drawn onto the unfolded
 * paper airplane. Pure UI: the actor decides what send/close actually do.
 */
export default function ContactLetterForm({
  onSend,
  onClose,
}: {
  onSend: (fields: LetterFields) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const sendTimeout = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (sendTimeout.current !== null) {
        window.clearTimeout(sendTimeout.current);
      }
    },
    [],
  );

  // Escape closes the letter (same as the ✕).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (sent) return;
    setSent(true);
    // Brief "sent ✓" beat before the letter folds itself back up.
    sendTimeout.current = window.setTimeout(
      () => onSend({ email, subject, message }),
      800,
    );
  };

  return (
    <Html
      transform
      position={[0, 0, 0.03]}
      distanceFactor={6}
      occlude
      zIndexRange={[10_000, 0]}
    >
      <form
        aria-label="Send Monther a message"
        onSubmit={handleSend}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 260,
          boxSizing: "border-box",
          padding: "18px 18px 20px",
          position: "relative",
          userSelect: "none",
          color: inkColor,
          backgroundColor: "#f5f2e9",
          backgroundImage: `url("${projectUI.paperTexture}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          border: "1.5px solid rgba(80, 74, 64, 0.38)",
          borderRadius: 2,
          boxShadow: "0 7px 18px rgba(31, 27, 20, 0.22)",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 6,
            right: 7,
            border: "none",
            background: "transparent",
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: 20,
            fontWeight: 700,
            color: inkColor,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        <input
          aria-label="Email"
          style={fieldStyle}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
          maxLength={160}
          required
          disabled={sent}
        />
        <input
          aria-label="Subject"
          style={{ ...fieldStyle, marginTop: 7 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="subject"
          maxLength={160}
          required
          disabled={sent}
        />
        <textarea
          aria-label="Message"
          style={{ ...fieldStyle, marginTop: 7 }}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="message"
          minLength={8}
          maxLength={1200}
          required
          disabled={sent}
        />

        <button
          type="submit"
          disabled={sent}
          aria-live="polite"
          style={{
            marginTop: 10,
            width: "100%",
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: 18,
            fontWeight: 700,
            color: inkColor,
            background: "#ffffff",
            border: "2px solid #111111",
            borderRadius: 10,
            padding: "6px 0",
            cursor: sent ? "wait" : "pointer",
            boxShadow: "2px 2px 0 #111111",
            opacity: sent ? 0.72 : 1,
            transition: "transform 160ms ease, opacity 160ms ease",
            transform: sent ? "scale(0.98)" : undefined,
          }}
          onMouseEnter={(e) => {
            if (!sent) e.currentTarget.style.transform = "rotate(-1deg) scale(1.03)";
          }}
          onMouseLeave={(e) => {
            if (!sent) e.currentTarget.style.transform = "none";
          }}
        >
          {sent ? "opening mail app…" : "send ✈"}
        </button>
      </form>
    </Html>
  );
}
