import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  journeyKeyboardDirection,
  portfolioKeyboardAction,
} from "../src/components/scene/keyboardControls";

describe("portfolio keyboard shortcuts", () => {
  test("entry works with the main keyboard, numpad and legacy Space value", () => {
    assert.equal(
      portfolioKeyboardAction({ key: "Enter", code: "Enter" }),
      "enter",
    );
    assert.equal(
      portfolioKeyboardAction({ key: "Enter", code: "NumpadEnter" }),
      "enter",
    );
    assert.equal(
      portfolioKeyboardAction({ key: " ", code: "Space" }),
      "enter",
    );
    assert.equal(portfolioKeyboardAction({ key: "Spacebar" }), "enter");
  });

  test("day/night supports either the typed key or physical KeyN code", () => {
    assert.equal(
      portfolioKeyboardAction({ key: "n", code: "KeyN" }),
      "toggle-day-night",
    );
    assert.equal(
      portfolioKeyboardAction({ key: "N" }),
      "toggle-day-night",
    );
    assert.equal(
      portfolioKeyboardAction({ key: "م", code: "KeyN" }),
      "toggle-day-night",
    );
    assert.equal(portfolioKeyboardAction({ key: "Escape" }), null);
  });
});

describe("journey keyboard travel", () => {
  test("all arrow keys and paging keys move along the route", () => {
    assert.equal(journeyKeyboardDirection({ key: "ArrowDown" }), 1);
    assert.equal(journeyKeyboardDirection({ key: "ArrowRight" }), 1);
    assert.equal(journeyKeyboardDirection({ key: "PageDown" }), 1);
    assert.equal(journeyKeyboardDirection({ key: "ArrowUp" }), -1);
    assert.equal(journeyKeyboardDirection({ key: "ArrowLeft" }), -1);
    assert.equal(journeyKeyboardDirection({ key: "PageUp" }), -1);
  });

  test("Space moves forward and Shift+Space moves backward", () => {
    assert.equal(
      journeyKeyboardDirection({ key: " ", code: "Space" }),
      1,
    );
    assert.equal(
      journeyKeyboardDirection({ key: " ", code: "Space", shiftKey: true }),
      -1,
    );
    assert.equal(journeyKeyboardDirection({ key: "n", code: "KeyN" }), 0);
  });
});
