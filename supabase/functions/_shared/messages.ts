// The follow-up wording, for functions that send without a browser in the
// loop. src/config/site.js is the source of truth for the app; these MUST
// stay word for word identical to it (and MSG_ATTENDED to the approved
// WhatsApp template next_steps_followup), because what is recorded here
// is what the chat then shows the person as having received. An Edge
// Function cannot import from src/, so the copy is kept here on purpose,
// with this warning, rather than reached for across the repo.
export const MSG_ATTENDED =
  "Hi [Name], this is Rig Church Lagos. We are glad you joined us at Next Steps. We really hope you enjoyed your time with us, and we would love to see you again soon. Have a wonderful week!";
export const MSG_COMPLETED =
  "[Name], congratulations on completing Next Steps! We're celebrating you. Someone from leadership will be in touch about what comes next.";

export const fillMsg = (tpl: string, name: string) => tpl.replace(/\[Name\]/g, name);
