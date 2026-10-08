import { setting } from "@/server/env";

/** Sign-in codes go out through Resend. Without a key (local dev) the code is printed to the server log. */
export async function sendSignInCode(email: string, code: string) {
  const key = setting("RESEND_API_KEY");
  if (!key) {
    console.log(`\n[dev] Sign-in code for ${email}: ${code}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: setting("EMAIL_FROM") ?? "HKDSE Practice <no-reply@example.com>",
      to: email,
      subject: `Your sign-in code: ${code} / 你的登入碼：${code}`,
      text: `Your sign-in code is ${code}. It expires in 10 minutes.\n\n你的登入碼是 ${code}，10 分鐘內有效。`,
    }),
  });
  if (!res.ok) console.error("Resend failed", res.status, await res.text().catch(() => ""));
}
