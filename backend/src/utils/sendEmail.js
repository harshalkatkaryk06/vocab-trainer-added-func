// Sends transactional email via Brevo's HTTP API.
// Requires env: BREVO_API_KEY, BREVO_SENDER_EMAIL, (optional) BREVO_SENDER_NAME.
// NOTE: the backend egress allowlist must include `api.brevo.com`.
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");
  if (!process.env.BREVO_SENDER_EMAIL) throw new Error("BREVO_SENDER_EMAIL is not set");

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "VocabTrainer",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }

  return res.json().catch(() => ({}));
};

export default sendEmail;