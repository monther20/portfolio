import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactFieldsAreValid,
  submitContactMessage,
  type LetterFields,
} from "../src/components/scene/airplane/contactSubmission";

const message: LetterFields = {
  email: "visitor@example.com",
  subject: "Project & collaboration",
  message: "Hello Monther, let’s work together!",
  botField: "",
};

test("contact validation rejects whitespace, invalid email, and oversized input", () => {
  assert.ok(contactFieldsAreValid(message));
  assert.equal(contactFieldsAreValid({ ...message, subject: "   " }), false);
  assert.equal(contactFieldsAreValid({ ...message, email: "visitor@" }), false);
  assert.equal(contactFieldsAreValid({ ...message, message: "        " }), false);
  assert.equal(
    contactFieldsAreValid({ ...message, message: "a".repeat(1201) }),
    false,
  );
});

test("Netlify receives encoded fields and delivery success follows its response", async () => {
  let calls = 0;
  const request = (async (url: string, init: RequestInit) => {
    calls++;
    assert.equal(url, "/__forms.html");
    assert.equal(init.method, "POST");
    assert.deepEqual(init.headers, {
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const body = new URLSearchParams(String(init.body));
    assert.equal(body.get("form-name"), "contact");
    for (const field of ["email", "subject", "message"] as const) {
      assert.equal(body.get(field), message[field]);
    }
    assert.equal(body.get("bot-field"), "");
    return new Response(null, { status: calls === 1 ? 200 : 503 });
  }) as typeof fetch;
  assert.equal(await submitContactMessage(message, request), true);
  assert.equal(await submitContactMessage(message, request), false);
  assert.equal(
    await submitContactMessage({ ...message, subject: " " }, request),
    false,
  );
  assert.equal(calls, 2);
});

test("failed and timed-out contact requests release the UI for retry", async () => {
  const failed = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  assert.equal(await submitContactMessage(message, failed), false);
  const stalled = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
        once: true,
      });
    })) as typeof fetch;
  assert.equal(await submitContactMessage(message, stalled, 10), false);
});
