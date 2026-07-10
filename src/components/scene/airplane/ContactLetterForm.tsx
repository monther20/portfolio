"use client";

import React, { useEffect, useState } from "react";
import { Html } from "@react-three/drei";

const inkColor = "#3a372f";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.55)",
  border: "1.6px dashed #8e8a82",
  borderRadius: 6,
  padding: "6px 8px",
  fontFamily: "var(--font-patrick), 'Patrick Hand', var(--font-caveat), cursive",
  fontSize: 14,
  color: inkColor,
  outline: "none",
  resize: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-caveat), 'Caveat', cursive",
  fontSize: 15,
  fontWeight: 700,
  color: inkColor,
  display: "block",
  marginBottom: 2,
};

export type LetterFields = { name: string; email: string; message: string };

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

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
    window.setTimeout(() => onSend({ name, email, message }), 800);
  };

  return (
    <Html
      transform
      position={[0, 0, 0.03]}
      distanceFactor={6}
      occlude={false}
      zIndexRange={[40, 0]}
    >
      <form
        onSubmit={handleSend}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ width: 250, padding: "10px 14px", position: "relative", userSelect: "none" }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 2,
            right: 2,
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

        <div
          style={{
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: 21,
            fontWeight: 700,
            color: inkColor,
            marginBottom: 8,
          }}
        >
          write me a message ✎
        </div>

        <label style={labelStyle}>
          name
          <input
            style={fieldStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
          />
        </label>
        <label style={{ ...labelStyle, marginTop: 6 }}>
          email
          <input
            style={fieldStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@somewhere.com"
          />
        </label>
        <label style={{ ...labelStyle, marginTop: 6 }}>
          message
          <textarea
            style={fieldStyle}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="say hi…"
          />
        </label>

        <button
          type="submit"
          style={{
            marginTop: 10,
            width: "100%",
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: 18,
            fontWeight: 700,
            color: inkColor,
            background: "#fff8e8",
            border: "2px solid #5a5751",
            borderRadius: 10,
            padding: "6px 0",
            cursor: "pointer",
            transition: "transform 160ms ease",
            transform: sent ? "scale(0.98)" : undefined,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "rotate(-1deg) scale(1.03)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "none";
          }}
        >
          {sent ? "sent ✓" : "fold & send ✈"}
        </button>
      </form>
    </Html>
  );
}
