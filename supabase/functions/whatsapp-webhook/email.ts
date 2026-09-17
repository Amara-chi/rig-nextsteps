// The reply-notification email, in the same shell as supabase/templates/
// invite.html and reset-password.html: table layout, inline styles only,
// Arial (webfonts don't survive most mail clients), brand hexes hardcoded
// because an email can't reach theme.css. Keep the three in step.

// Message bodies are written by whoever texted the church, so they are
// untrusted input going into HTML. Escaped, always.
const esc = (v: string) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type Item = { name: string; body: string };

export function subjectFor(items: Item[]) {
  return items.length === 1
    ? `New WhatsApp reply from ${items[0].name}`
    : `${items.length} new WhatsApp replies`;
}

// Plain-text alternative. Some clients show it, and it is what lands in a
// screen reader's hands, so it says the same things in the same order.
export function textFor(items: Item[], appUrl: string) {
  const lines = items.map((i) => `${i.name}:\n${i.body}`).join("\n\n");
  return `${lines}\n\nReply in the app: ${appUrl}\n`;
}

export function htmlFor(items: Item[], appUrl: string) {
  const heading = items.length === 1
    ? `${esc(items[0].name)} replied.`
    : `${items.length} people replied.`;
  const lead = "They messaged the church's WhatsApp number. Replies can be sent straight from the app.";

  const blocks = items.map((i) => `
      <tr>
        <td style="padding:0 28px 12px;">
          <div style="font-size:12px;font-weight:bold;color:#454B59;margin-bottom:5px;">${esc(i.name)}</div>
          <div style="background:#EFEBE2;border-left:3px solid #F25125;border-radius:0 12px 12px 0;padding:12px 15px;font-size:14px;line-height:1.55;color:#454B59;white-space:pre-wrap;">${esc(i.body)}</div>
        </td>
      </tr>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subjectFor(items))}</title>
</head>
<body style="margin:0;padding:0;background:#FBF9F4;">

<div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;color:#FBF9F4;">
  ${esc(items[0]?.body?.slice(0, 120) ?? "Someone replied on WhatsApp.")}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF9F4;">
<tr>
<td align="center" style="padding:28px 16px;">

  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#FFFFFF;border:1px solid #DBD4C4;border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:#454B59;">

    <tr>
      <td align="center" style="background:#EFEBE2;padding:22px 24px;border-radius:13px 13px 0 0;">
        <img src="https://nextsteps.rigchurchlagos.org/images/logo.png" alt="Rig Church Lagos" width="150" style="height:42px;width:auto;display:block;border:0;">
        <div style="font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:#F25125;font-weight:bold;margin-top:9px;">Next Steps</div>
      </td>
    </tr>

    <tr>
      <td style="padding:26px 28px 8px;">
        <div style="width:34px;height:10px;background:#F25125;border-radius:999px 999px 3px 3px;font-size:0;line-height:0;">&nbsp;</div>
        <h1 style="margin:14px 0 8px;font-size:26px;line-height:1.15;font-weight:bold;color:#313743;">${heading}</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#5A6070;">${lead}</p>
      </td>
    </tr>
${blocks}
    <tr>
      <td style="padding:8px 28px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#F25125" style="border-radius:12px;">
              <a href="${esc(appUrl)}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:12px;">Open Messages</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 28px 26px;">
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:#7A8090;">
          You get one of these when a conversation needs attention, not one per message. Opening it in the app marks it read for the whole team.
        </p>
      </td>
    </tr>

  </table>

  <div style="max-width:560px;margin:14px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#A8ADB9;text-align:center;">
    Sent by the Next Steps platform for Rig Church Lagos.
  </div>

</td>
</tr>
</table>

</body>
</html>`;
}
