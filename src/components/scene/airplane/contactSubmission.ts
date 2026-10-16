export type LetterFields = {
  email: string;
  subject: string;
  message: string;
  botField: string;
};

export function contactFieldsAreValid(fields: LetterFields): boolean {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) &&
    fields.email.length <= 160 &&
    fields.subject.trim().length > 0 &&
    fields.subject.length <= 160 &&
    fields.message.trim().length >= 8 &&
    fields.message.length <= 1200
  );
}

/** Bound the request so an unavailable form endpoint cannot leave the UI locked. */
export async function submitContactMessage(
  fields: LetterFields,
  request: typeof fetch = fetch,
  timeoutMs = 20_000,
): Promise<boolean> {
  if (!contactFieldsAreValid(fields)) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await request("/__forms.html", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "form-name": "contact",
        "bot-field": fields.botField,
        email: fields.email,
        subject: fields.subject,
        message: fields.message,
      }).toString(),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
