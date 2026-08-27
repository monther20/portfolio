"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Html } from "@react-three/drei";

import { useResponsiveExperience } from "../../ResponsiveExperience";
import type { PaperAirplaneContactFormDebug } from "./paperAirplaneDefaults";

const HTML_SHARPNESS_SCALE = 2;
const SUBMISSION_SUCCESS_DELAY_MS = 1600;

type SubmissionState = "idle" | "submitting" | "success" | "error";

type CloseButtonDebug = PaperAirplaneContactFormDebug["closeButton"];

function closeButtonStyle(
  button: CloseButtonDebug,
  hovered: boolean,
): React.CSSProperties {
  return {
    position: "absolute",
    top: button.top,
    right: button.right,
    zIndex: button.zIndex,
    display: button.visible ? "grid" : "none",
    placeItems: "center",
    width: button.size,
    height: button.size,
    boxSizing: "border-box",
    padding: 0,
    border: "none",
    color: hovered ? button.hoverTextColor : button.textColor,
    background: "transparent",
    boxShadow: "none",
    cursor: "pointer",
    transform: `rotate(${hovered ? button.hoverRotation : button.rotation}deg) scale(${hovered ? button.hoverScale : 1})`,
    transformOrigin: "center",
    transition:
      "transform 140ms ease, color 140ms ease, background 140ms ease",
    appearance: "none",
  };
}

function closeIconStyle(button: CloseButtonDebug): React.CSSProperties {
  return {
    width: button.iconSize,
    height: button.iconSize,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: button.iconStrokeWidth,
    strokeLinecap: "round",
    pointerEvents: "none",
  };
}

export type LetterFields = {
  email: string;
  subject: string;
  message: string;
  botField: string;
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

function fieldStyle(
  field: PaperAirplaneContactFormDebug["fields"]["email"],
  minimumFontSize: number,
  sketchRotation: number,
): React.CSSProperties {
  const borderWidth = Math.max(1.5, field.borderWidth);
  const borderColor = hexToRgba(
    field.borderColor,
    Math.max(0.68, field.borderOpacity),
  );
  const pencilShadow = hexToRgba(field.borderColor, 0.24);
  const faintPencilShadow = hexToRgba(field.borderColor, 0.13);
  const radius = Math.max(4, field.borderRadius);

  return {
    width: `${field.width}%`,
    height: field.height > 0 ? field.height : undefined,
    boxSizing: "border-box",
    position: "relative",
    left: field.positionX,
    top: field.positionY,
    marginTop: field.marginTop,
    transform: `rotate(${field.rotation + sketchRotation}deg) scale3d(${field.scaleX}, ${field.scaleY}, ${field.scaleZ})`,
    transformOrigin: "center center",
    background: hexToRgba(field.backgroundColor, field.backgroundOpacity),
    border: `${borderWidth}px solid ${borderColor}`,
    borderRadius: `${radius + 2}px ${radius - 1}px ${radius + 3}px ${radius}px / ${radius}px ${radius + 3}px ${radius - 1}px ${radius + 2}px`,
    padding: `${field.paddingY}px ${field.paddingX}px`,
    boxShadow: `0.9px 0.6px 0 ${pencilShadow}, -0.7px 1px 0 ${faintPencilShadow}, inset 0.5px -0.5px 0 ${faintPencilShadow}`,
    fontFamily:
      "var(--font-patrick), 'Patrick Hand', var(--font-caveat), cursive",
    fontSize: Math.max(field.fontSize, minimumFontSize),
    color: field.textColor,
    caretColor: field.textColor,
    outline: "none",
    resize: "none",
    appearance: "none",
    userSelect: "text",
  };
}

function sendButtonTransform(
  button: PaperAirplaneContactFormDebug["sendButton"],
  scaleMultiplier = 1,
  rotationOffset = 0,
) {
  return `rotate(${button.rotation + rotationOffset}deg) scale3d(${button.scaleX * scaleMultiplier}, ${button.scaleY * scaleMultiplier}, ${button.scaleZ * scaleMultiplier})`;
}

/** The email form is rendered directly on the GLB's unfolded paper surface. */
export default function ContactLetterForm({
  onSend,
  onSuccess,
  onClose,
  debug,
}: {
  onSend: (fields: LetterFields) => Promise<boolean> | boolean;
  onSuccess: () => void;
  onClose: () => void;
  debug: PaperAirplaneContactFormDebug;
}) {
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const submissionLocked =
    submissionState === "submitting" || submissionState === "success";
  const responsive = useResponsiveExperience();
  const minimumFieldFontSize = responsive.isCoarsePointer ? 16 : 0;
  const sendButtonRadius = Math.max(8, debug.sendButton.borderRadius);
  const sendButtonBorderColor = hexToRgba(
    debug.sendButton.borderColor,
    Math.max(0.68, debug.sendButton.borderOpacity),
  );
  const sendButtonPencilShadow = hexToRgba(
    debug.sendButton.borderColor,
    0.22,
  );

  const closeWithFold = useCallback(
    (
      event?: Pick<
        KeyboardEvent | React.KeyboardEvent,
        "key" | "preventDefault" | "stopPropagation"
      >,
    ) => {
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

  useEffect(() => {
    if (submissionState !== "success") return;

    const timeoutId = window.setTimeout(
      onSuccess,
      SUBMISSION_SUCCESS_DELAY_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [onSuccess, submissionState]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLocked) return;

    const formData = new FormData(event.currentTarget);
    const fields: LetterFields = {
      email: String(formData.get("email") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      botField: String(formData.get("bot-field") ?? ""),
    };

    setSubmissionState("submitting");

    try {
      const ok = await onSend(fields);
      setSubmissionState(ok ? "success" : "error");
    } catch (error) {
      console.error("Contact form submission handler failed", error);
      setSubmissionState("error");
    }
  };

  return (
    <Html
      transform
      position={[debug.html.x, debug.html.y, debug.html.z]}
      distanceFactor={debug.html.distanceFactor}
      scale={1 / HTML_SHARPNESS_SCALE}
      occlude={debug.html.occlude}
      zIndexRange={[debug.html.zIndexNear, debug.html.zIndexFar]}
      pointerEvents="auto"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      <form
        name="contact"
        method="POST"
        action="/__forms.html"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        className="contact-letter-form contact-letter-form--paper"
        aria-label="Send Monther a message"
        onSubmit={handleSend}
        onWheel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
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
        <input type="hidden" name="form-name" value="contact" />
        <p className="contact-letter-form__honeypot" aria-hidden="true">
          <label>
            Do not fill this out if you are human:
            <input
              name="bot-field"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </p>

        <button
          type="button"
          className="contact-letter-form__close"
          aria-label="Close email form"
          style={closeButtonStyle(debug.closeButton, closeButtonHovered)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeWithFold();
          }}
          onMouseEnter={() => setCloseButtonHovered(true)}
          onMouseLeave={() => setCloseButtonHovered(false)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            style={closeIconStyle(debug.closeButton)}
          >
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>

        <input
          aria-label="Email"
          style={fieldStyle(debug.fields.email, minimumFieldFontSize, -0.28)}
          type="email"
          inputMode="email"
          name="email"
          placeholder={debug.fields.email.placeholder}
          autoComplete="email"
          maxLength={160}
          required
          disabled={submissionLocked}
        />
        <input
          aria-label="Subject"
          style={fieldStyle(debug.fields.subject, minimumFieldFontSize, 0.2)}
          name="subject"
          placeholder={debug.fields.subject.placeholder}
          maxLength={160}
          required
          disabled={submissionLocked}
        />
        <textarea
          aria-label="Message"
          style={fieldStyle(debug.fields.message, minimumFieldFontSize, -0.14)}
          rows={Math.max(2, Math.round(debug.fields.message.rows))}
          name="message"
          placeholder={debug.fields.message.placeholder}
          minLength={8}
          maxLength={1200}
          required
          disabled={submissionLocked}
        />

        {submissionState !== "idle" ? (
          <div
            id="contact-form-status"
            className={`contact-letter-form__status contact-letter-form__status--${submissionState}`}
            role={submissionState === "error" ? "alert" : "status"}
            aria-live={submissionState === "error" ? "assertive" : "polite"}
            style={{
              top: 10,
              left: debug.container.paddingLeft,
              right: debug.container.paddingRight,
            }}
          >
            {submissionState === "submitting"
              ? "Sending your message…"
              : submissionState === "success"
                ? "Message sent. Thank you!"
                : "Could not send. Please try again."}
          </div>
        ) : null}

        <button
          type="submit"
          className="contact-letter-form__send"
          disabled={submissionLocked}
          aria-describedby={
            submissionState === "idle" ? undefined : "contact-form-status"
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            left: debug.sendButton.positionX,
            top: debug.sendButton.positionY,
            marginTop: debug.sendButton.marginTop,
            marginLeft: "auto",
            marginRight: "auto",
            width: debug.sendButton.width,
            height:
              debug.sendButton.height > 0
                ? debug.sendButton.height
                : undefined,
            boxSizing: "border-box",
            fontFamily: "var(--font-caveat), 'Caveat', cursive",
            fontSize: debug.sendButton.fontSize,
            fontWeight: debug.sendButton.fontWeight,
            color: debug.sendButton.textColor,
            background: hexToRgba(
              debug.sendButton.backgroundColor,
              debug.sendButton.backgroundOpacity,
            ),
            border: `1.5px solid ${sendButtonBorderColor}`,
            borderRadius: `${sendButtonRadius + 2}px ${sendButtonRadius - 1}px ${sendButtonRadius + 1}px ${sendButtonRadius - 2}px / ${sendButtonRadius - 1}px ${sendButtonRadius + 2}px ${sendButtonRadius - 2}px ${sendButtonRadius + 1}px`,
            padding:
              debug.sendButton.height > 0
                ? 0
                : `${debug.sendButton.paddingY}px 0`,
            lineHeight: 1,
            textAlign: "center",
            whiteSpace: "nowrap",
            cursor: submissionLocked ? "wait" : "pointer",
            boxShadow: `0.8px 0.7px 0 ${sendButtonPencilShadow}, -0.7px 0.9px 0 ${hexToRgba(debug.sendButton.borderColor, 0.12)}`,
            opacity: submissionLocked
              ? debug.sendButton.sentOpacity
              : debug.sendButton.opacity,
            transition: "transform 160ms ease, opacity 160ms ease",
            transformOrigin: "center center",
            transform: sendButtonTransform(
              debug.sendButton,
              submissionLocked ? debug.sendButton.sentScale : 1,
            ),
          }}
          onMouseEnter={(event) => {
            if (!submissionLocked) {
              event.currentTarget.style.transform = sendButtonTransform(
                debug.sendButton,
                debug.sendButton.hoverScale,
                debug.sendButton.hoverRotation,
              );
            }
          }}
          onMouseLeave={(event) => {
            if (!submissionLocked) {
              event.currentTarget.style.transform = sendButtonTransform(
                debug.sendButton,
              );
            }
          }}
        >
          {submissionState === "submitting"
            ? debug.sendButton.sendingLabel
            : submissionState === "success"
              ? "Sent!"
              : submissionState === "error"
                ? "Try again"
                : debug.sendButton.label}
        </button>
      </form>
    </Html>
  );
}
