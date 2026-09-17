// The reply-notification email. Only the middle of the card lives here;
// the banner, arch, button and footer come from the shared shell, so this
// and the Monday digest always look like the same sender.
import { quote, shell } from "../_shared/email.ts";

export type Item = { name: string; body: string };

export function subjectFor(items: Item[]) {
  return items.length === 1
    ? `New WhatsApp reply from ${items[0].name}`
    : `${items.length} new WhatsApp replies`;
}

// Plain-text alternative. Some clients show it, and it is what a screen
// reader gets, so it says the same things in the same order.
export function textFor(items: Item[], appUrl: string) {
  const lines = items.map((i) => `${i.name}:\n${i.body}`).join("\n\n");
  return `${lines}\n\nReply in the app: ${appUrl}\n`;
}

export function htmlFor(items: Item[], appUrl: string) {
  return shell({
    title: subjectFor(items),
    preview: items[0]?.body?.slice(0, 120) ?? "Someone replied on WhatsApp.",
    heading: items.length === 1 ? `${items[0].name} replied.` : `${items.length} people replied.`,
    lead: "They messaged the church's WhatsApp number. Replies can be sent straight from the app.",
    body: items.map((i) => quote(i.name, i.body)).join(""),
    ctaHref: appUrl,
    ctaLabel: "Open Messages",
    footnote: "You get one of these when a conversation needs attention, not one per message. Opening it in the app marks it read for the whole team.",
  });
}
