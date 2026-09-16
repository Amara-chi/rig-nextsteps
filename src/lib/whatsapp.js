import { supabase } from './supabaseClient.js'

// One door to the whatsapp-send function, shared by the Follow-Up Centre, the
// Support pages and ChatPanel.
//
// functions.invoke() reports any non-2xx as a FunctionsHttpError whose own
// message is the generic "Edge Function returned a non-2xx status code". The
// message worth showing a human (the 24-hour window explanation, the missing
// completion template, Meta's own rejection text) is in the response body,
// which has to be read back off error.context.
export async function sendWhatsApp(body) {
  const { data, error } = await supabase.functions.invoke('whatsapp-send', { body })
  if (error) {
    let detail = ''
    try { detail = (await error.context?.json())?.error } catch { /* fall through to the generic line */ }
    return { ok: false, error: detail || "Couldn't send that. Try again in a moment." }
  }
  if (data && data.ok === false) return { ok: false, error: data.error }
  return { ok: true, data }
}
