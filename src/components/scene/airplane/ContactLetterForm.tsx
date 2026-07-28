"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Html } from "@react-three/drei";

import type { PaperAirplaneContactFormDebug } from "./paperAirplaneDefaults";

export type LetterFields = {
  email: string;
  subject: string;
  message: string;
};

function fieldStyle(multiline = false): React.CSSProperties {
  return {
    position: "static",
    width: "100%",
    height: multiline ? "clamp(8rem, 24dvh, 12rem)" : 48,
    minHeight: multiline ? 128 : 48,
    boxSizing: "border-box",
    marginTop: 12,
    padding: multiline ? "12px 14px" : "0 14px",
    border: "1.5px solid rgba(35, 35, 35, 0.58)",
    borderRadius: 8,
    color: "#111111",
    caretColor: "#111111",
    background: "rgba(255, 255, 255, 0.56)",
    boxShadow: "none",
    outline: "none",
    resize: "none",
    appearance: "none",
    fontFamily: "var(--font-patrick), 'Patrick Hand', var(--font-caveat), cursive",
    fontSize: 16,
    lineHeight: 1.25,
    transform: "none",
    userSelect: "text",
  };
}

/** A viewport-level paper form that stays readable at every camera FOV. */
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => closeWithFold(event);
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [closeWithFold]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sent) return;

    const formData = new FormData(event.currentTarget);
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
    }
  };

  return (
    <Html
      fullscreen
      zIndexRange={[20_000, 10_001]}
      wrapperClass="contact-modal-portal"
      pointerEvents="auto"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="contact-modal"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="contact-modal__paper">
          <form
            className="contact-letter-form contact-letter-form--compact"
            aria-labelledby="contact-letter-title"
            role="dialog"
            aria-modal="true"
            onSubmit={handleSend}
            onWheel={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDownCapture={closeWithFold}
          >
            <button
              type="button"
              className="contact-letter-form__close"
              aria-label="Close message form"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>

            <h2 id="contact-letter-title" className="contact-letter-form__title">
              Send a message
            </h2>

            <input
              aria-label="Email"
              style={fieldStyle()}
              type="email"
              inputMode="email"
              name="email"
              placeholder={debug.fields.email.placeholder}
              autoComplete="email"
              maxLength={160}
              required
              disabled={sent}
            />
            <input
              aria-label="Subject"
              style={fieldStyle()}
              name="subject"
              placeholder={debug.fields.subject.placeholder}
              maxLength={160}
              required
              disabled={sent}
            />
            <textarea
              aria-label="Message"
              style={fieldStyle(true)}
              rows={Math.max(2, Math.round(debug.fields.message.rows))}
              name="message"
              placeholder={debug.fields.message.placeholder}
              minLength={8}
              maxLength={1200}
              required
              disabled={sent}
            />

            {error ? (
              <div className="contact-letter-form__error" role="alert">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="contact-letter-form__send"
              disabled={sent}
              aria-live="polite"
            >
              {sent ? "sending…" : debug.sendButton.label}
            </button>
          </form>
        </div>
      </div>
    </Html>
  );
}
