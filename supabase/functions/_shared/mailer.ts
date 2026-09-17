// SMTP sending, shared by the reply alert and the Monday digest.
//
// The church's own mailbox, no third-party mail service. Port decides the
// TLS mode: 465 is implicit TLS, anything else is treated as STARTTLS.
// Hostinger's 587/STARTTLS path fails inside denomailer ("invalid cmd" in
// the handshake), so 465 is the working setting here.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export function mailRecipients() {
  return (Deno.env.get("NOTIFY_EMAILS") ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}

export async function sendMail(opts: { subject: string; text: string; html: string }) {
  const host = Deno.env.get("SMTP_HOST");
  const to = mailRecipients();
  if (!host || to.length === 0) return false;   // email is a convenience, never the record

  const port = Number(Deno.env.get("SMTP_PORT") ?? 587);
  const addr = Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "";
  const name = Deno.env.get("SMTP_FROM_NAME") ?? "Rig Church Lagos";

  console.log(`sendMail: ${to.length} recipient(s) via ${host}:${port}`);
  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: port === 465,
      auth: { username: Deno.env.get("SMTP_USER") ?? "", password: Deno.env.get("SMTP_PASS") ?? "" },
    },
  });
  try {
    await client.send({
      // Clients show the display name, not the address, so without this
      // every email reads as "info@rigchurchlagos.org".
      from: addr.includes("<") ? addr : `${name} <${addr}>`,
      to,
      subject: opts.subject,
      content: opts.text,
      html: opts.html,
    });
    console.log("sendMail: sent");
    return true;
  } finally {
    await client.close();
  }
}
