"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Html } from "@react-three/drei";

import type { PaperAirplaneContactFormDebug } from "./paperAirplaneDefaults";

const HTML_SHARPNESS_SCALE = 2;

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
    caretColor: field.textColor,
    outline: "none",
    resize: "none",
    appearance: "none",
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
  onSend: (fields: LetterFields) => Promise<boolean> | boolean;
  onClose: () => void;
  debug: PaperAirplaneContactFormDebug;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const closeWithFold = useCallback(
    (event?: Pick<KeyboardEvent | React.KeyboardEvent, "key" | "preventDefault" | "stopPropagation">) => {
      if (event && event.key !== "Escape") return;

      event?.preventDefault();
      event?.stopPropagation();
      onClose();
    },
    [onClose],
  );

  // Escape folds the letter back into the airplane. Use capture so focused
  // inputs/textareas cannot swallow the key before the close handler runs.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => closeWithFold(event);
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [closeWithFold]);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sent) return;

    const formData = new FormData(e.currentTarget);
    const fields = {
      email: String(formData.get("email") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    setSent(true);
    setError("");

    const ok = await onSend(fields);

    if (!ok) {
      setSent(false);
      setError("Could not send. Please try again.");
      return;
    }

    // The actor folds the paper after a successful send.
  };

  return (
    <Html
      transform
      position={[debug.html.x, debug.html.y, debug.html.z]}
      distanceFactor={debug.html.distanceFactor}
      scale={1 / HTML_SHARPNESS_SCALE}
      occlude={debug.html.occlude}
      zIndexRange={[debug.html.zIndexNear, debug.html.zIndexFar]}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      <form
        aria-label="Send Monther a message"
        onSubmit={handleSend}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDownCapture={closeWithFold}
        style={{
          width: debug.container.width,
          boxSizing: "border-box",
          padding: `${debug.container.paddingTop}px ${debug.container.paddingRight}px ${debug.container.paddingBottom}px ${debug.container.paddingLeft}px`,
          position: "relative",
          userSelect: "none",
          color: debug.container.color,
          background: "transparent",
          opacity: debug.container.opacity,
          transform: `scale(${debug.container.scale * HTML_SHARPNESS_SCALE}) translateZ(0)`,
          transformOrigin: "center center",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          WebkitFontSmoothing: "antialiased",
          textRendering: "geometricPrecision",
          willChange: "transform",
        }}
      >
        <input
          aria-label="Email"
          style={fieldStyle(debug.fields.email)}
          type="email"
          name="email"
          placeholder={debug.fields.email.placeholder}
          autoComplete="email"
          maxLength={160}
          required
          disabled={sent}
        />
        <input
          aria-label="Subject"
          style={fieldStyle(debug.fields.subject)}
          name="subject"
          placeholder={debug.fields.subject.placeholder}
          maxLength={160}
          required
          disabled={sent}
        />
        <textarea
          aria-label="Message"
          style={fieldStyle(debug.fields.message)}
          rows={Math.max(2, Math.round(debug.fields.message.rows))}
          name="message"
          placeholder={debug.fields.message.placeholder}
          minLength={8}
          maxLength={1200}
          required
          disabled={sent}
        />

        {error ? (
          <div
            role="alert"
            style={{
              marginTop: 7,
              fontFamily: "var(--font-patrick), 'Patrick Hand', var(--font-caveat), cursive",
              fontSize: 13,
              color: "#8d1f1f",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        ) : null}

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
