"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";

import type { PaperAirplaneContactFormDebug } from "../debug/createPaperAirplaneDebugGui";

const inkColor = "#111111";

export type LetterFields = {
  email: string;
  subject: string;
  message: string;
};

function hexToRgba(hex: string, opacity: number) {
  const clean = hex.replace("#", "").trim();
  const normalized = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) return hex;

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function fieldStyle(field: PaperAirplaneContactFormDebug["fields"]["email"]): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    marginTop: field.marginTop,
    background: hexToRgba(field.backgroundColor, field.backgroundOpacity),
    border: `${field.borderWidth}px solid ${hexToRgba(field.borderColor, field.borderOpacity)}`,
    borderRadius: field.borderRadius,
    padding: `${field.paddingY}px ${field.paddingX}px`,
    boxShadow: "none",
    fontFamily: "var(--font-patrick), 'Patrick Hand', var(--font-caveat), cursive",
    fontSize: field.fontSize,
    color: field.textColor,
    outline: "none",
    resize: "none",
  };
}

/**
 * ContactLetterForm — the handwriting-styled form drawn onto the unfolded
 * paper airplane. Pure UI: the actor decides what send/close actually do.
 */
export default function ContactLetterForm({
  onSend,
  onClose,
  debug,
}: {
  onSend: (fields: LetterFields) => void;
  onClose: () => void;
  debug: PaperAirplaneContactFormDebug;
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

  // Escape closes the letter.
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
      position={[debug.html.x, debug.html.y, debug.html.z]}
      distanceFactor={debug.html.distanceFactor}
      occlude={debug.html.occlude}
      zIndexRange={[debug.html.zIndexNear, debug.html.zIndexFar]}
    >
      <form
        aria-label="Send Monther a message"
        onSubmit={handleSend}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: debug.container.width,
          boxSizing: "border-box",
          padding: `${debug.container.paddingTop}px ${debug.container.paddingRight}px ${debug.container.paddingBottom}px ${debug.container.paddingLeft}px`,
          position: "relative",
          userSelect: "none",
          color: debug.container.color,
          background: "transparent",
          opacity: debug.container.opacity,
          transform: `scale(${debug.container.scale})`,
          transformOrigin: "center center",
        }}
      >
        <input
          aria-label="Email"
          style={fieldStyle(debug.fields.email)}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={debug.fields.email.placeholder}
          autoComplete="email"
          maxLength={160}
          required
          disabled={sent}
        />
        <input
          aria-label="Subject"
          style={fieldStyle(debug.fields.subject)}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={debug.fields.subject.placeholder}
          maxLength={160}
          required
          disabled={sent}
        />
        <textarea
          aria-label="Message"
          style={fieldStyle(debug.fields.message)}
          rows={Math.max(2, Math.round(debug.fields.message.rows))}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={debug.fields.message.placeholder}
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
            display: "block",
            marginTop: debug.sendButton.marginTop,
            marginLeft: "auto",
            marginRight: "auto",
            width: debug.sendButton.width,
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: debug.sendButton.fontSize,
            fontWeight: debug.sendButton.fontWeight,
            color: debug.sendButton.textColor,
            background: hexToRgba(debug.sendButton.backgroundColor, debug.sendButton.backgroundOpacity),
            border: `${debug.sendButton.borderWidth}px solid ${debug.sendButton.borderColor}`,
            borderRadius: debug.sendButton.borderRadius,
            padding: `${debug.sendButton.paddingY}px 0`,
            cursor: sent ? "wait" : "pointer",
            boxShadow: `${debug.sendButton.shadowX}px ${debug.sendButton.shadowY}px ${debug.sendButton.shadowBlur}px ${debug.sendButton.shadowColor}`,
            opacity: sent ? debug.sendButton.sentOpacity : debug.sendButton.opacity,
            transition: "transform 160ms ease, opacity 160ms ease",
            transform: sent ? `scale(${debug.sendButton.sentScale})` : undefined,
          }}
          onMouseEnter={(e) => {
            if (!sent) {
              e.currentTarget.style.transform = `rotate(${debug.sendButton.hoverRotation}deg) scale(${debug.sendButton.hoverScale})`;
            }
          }}
          onMouseLeave={(e) => {
            if (!sent) e.currentTarget.style.transform = "none";
          }}
        >
          {sent ? debug.sendButton.sendingLabel : debug.sendButton.label}
        </button>
      </form>
    </Html>
  );
}
