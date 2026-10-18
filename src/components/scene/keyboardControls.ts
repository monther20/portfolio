export type PortfolioKeyboardAction =
  | "enter"
  | "toggle-day-night"
  | null;

type KeyboardInput = {
  key: string;
  code?: string;
  shiftKey?: boolean;
};

const INTERACTIVE_TARGET_SELECTOR =
  "input, textarea, select, button, a, [role='button'], [role='switch']";

/** Do not let scene shortcuts take over while a visitor is typing or using UI. */
export function isInteractiveKeyboardTarget(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    Boolean(target.closest(INTERACTIVE_TARGET_SELECTOR))
  );
}

/** Global shortcuts that should work without requiring the canvas to be focused. */
export function portfolioKeyboardAction({
  key,
  code = "",
}: KeyboardInput): PortfolioKeyboardAction {
  const normalizedKey = key.toLowerCase();

  if (
    key === "Enter" ||
    code === "Enter" ||
    code === "NumpadEnter" ||
    key === " " ||
    key === "Spacebar" ||
    code === "Space"
  ) {
    return "enter";
  }

  if (normalizedKey === "n" || code === "KeyN") {
    return "toggle-day-night";
  }

  return null;
}

/** Positive moves forward; negative moves back along the portfolio route. */
export function journeyKeyboardDirection({
  key,
  code = "",
  shiftKey = false,
}: KeyboardInput): -1 | 0 | 1 {
  if (
    key === "ArrowDown" ||
    code === "ArrowDown" ||
    key === "ArrowRight" ||
    code === "ArrowRight" ||
    key === "PageDown" ||
    code === "PageDown"
  ) {
    return 1;
  }

  if (
    key === "ArrowUp" ||
    code === "ArrowUp" ||
    key === "ArrowLeft" ||
    code === "ArrowLeft" ||
    key === "PageUp" ||
    code === "PageUp"
  ) {
    return -1;
  }

  if (key === " " || key === "Spacebar" || code === "Space") {
    return shiftKey ? -1 : 1;
  }

  return 0;
}
