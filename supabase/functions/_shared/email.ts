// The one email shell, shared by every function that sends mail. Same
// design as supabase/templates/invite.html and reset-password.html: table
// layout, inline styles only, Arial (webfonts don't survive most mail
// clients), brand hexes hardcoded because an email can't reach theme.css.
//
// Lives in _shared rather than being copied per function precisely so the
// church's emails can't drift into looking like three different senders.

// Anything that came from a person rather than from us is escaped. The
// reply alert puts a newcomer's own words into HTML, which is the one place
// in the system where that happens.
export const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type Shell = {
  title: string;
  preview: string;
  heading: string;
  lead?: string;
  body: string;        // already-escaped HTML for the middle of the card
  ctaHref?: string;
  ctaLabel?: string;
  footnote?: string;
};

export function shell(s: Shell) {
  const cta = s.ctaHref && s.ctaLabel
    ? `
    <tr>
      <td style="padding:8px 28px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#F25125" style="border-radius:12px;">
              <a href="${esc(s.ctaHref)}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:12px;">${esc(s.ctaLabel)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const foot = s.footnote
    ? `
    <tr>
      <td style="padding:18px 28px 26px;">
        <p style="margin:0;font-size:12.5px;line-height:1.6;color:#7A8090;">${esc(s.footnote)}</p>
      </td>
    </tr>`
    : `<tr><td style="padding:0 0 18px;"></td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(s.title)}</title>
</head>
<body style="margin:0;padding:0;background:#FBF9F4;">

<div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;font-size:1px;line-height:1px;color:#FBF9F4;">${esc(s.preview)}</div>

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
        <h1 style="margin:14px 0 8px;font-size:26px;line-height:1.15;font-weight:bold;color:#313743;">${esc(s.heading)}</h1>
        ${s.lead ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#5A6070;">${esc(s.lead)}</p>` : ""}
      </td>
    </tr>
${s.body}${cta}${foot}
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

// A quoted block in the app's own note styling: cream, orange left edge.
export const quote = (label: string, text: string) => `
      <tr>
        <td style="padding:0 28px 12px;">
          <div style="font-size:12px;font-weight:bold;color:#454B59;margin-bottom:5px;">${esc(label)}</div>
          <div style="background:#EFEBE2;border-left:3px solid #F25125;border-radius:0 12px 12px 0;padding:12px 15px;font-size:14px;line-height:1.55;color:#454B59;white-space:pre-wrap;">${esc(text)}</div>
        </td>
      </tr>`;

// The at-a-glance strip: every number in one block at the top, so the
// email answers "is there anything for me this week" before anyone scrolls.
// A zero row still shows, greyed — "nothing waiting on a reply" is itself
// worth knowing on a Monday.
export const stats = (rows: { label: string; n: number }[]) => `
      <tr>
        <td style="padding:0 28px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E6E0D2;border-radius:12px;">
            ${rows.map((r, i) => `<tr>
              <td style="padding:9px 14px;font-size:13.5px;color:${r.n ? "#454B59" : "#9AA0AE"};${i ? "border-top:1px solid #EFEBE2;" : ""}">${esc(r.label)}</td>
              <td align="right" style="padding:9px 14px;font-size:16px;font-weight:bold;color:${r.n ? "#F25125" : "#C3C7D1"};${i ? "border-top:1px solid #EFEBE2;" : ""}">${r.n}</td>
            </tr>`).join("")}
          </table>
        </td>
      </tr>`;

// A headed list of names. Capped: a digest nobody finishes reading is worse
// than one that says "and 30 others" and trusts staff to open the app.
export const section = (title: string, items: string[], cap = 5) => {
  if (items.length === 0) return "";
  const shown = items.slice(0, cap);
  const rest = items.length - shown.length;
  return `
      <tr>
        <td style="padding:0 28px 14px;">
          <div style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#F25125;font-weight:bold;margin-bottom:7px;">${esc(title)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E6E0D2;border-radius:12px;">
            ${shown.map((t, i) => `<tr><td style="padding:9px 14px;font-size:13.5px;color:#454B59;${i ? "border-top:1px solid #EFEBE2;" : ""}">${esc(t)}</td></tr>`).join("")}
            ${rest > 0 ? `<tr><td style="padding:9px 14px;font-size:12.5px;color:#7A8090;border-top:1px solid #EFEBE2;">and ${rest} more in the app</td></tr>` : ""}
          </table>
        </td>
      </tr>`;
};
