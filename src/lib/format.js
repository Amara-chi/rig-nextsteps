export const initials = (n) => (n || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// Nigerian numbers (stored 234XXXXXXXXXX) as 0803 000 0000. Foreign numbers
// (stored as their own digits, e.g. 447852202545) get a + so they read as
// international rather than as a garbled local number. Anything else, such
// as a short number flagged for checking, is shown as it was given.
export const fmtPhone = (p) => {
  const d = p || ''
  if (/^234\d{10}$/.test(d)) return d.replace(/^234/, '0').replace(/(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')
  if (/^[1-9]\d{9,14}$/.test(d)) return '+' + d
  return d
}

export const waLink = (phone, msg) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`

export const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')

export const todayStr = () => new Date().toISOString().slice(0, 10)

// The calendar day a timestamp falls on here (YYYY-MM-DD), for date inputs.
export const localDay = (ts) => {
  const d = ts ? new Date(ts) : new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const fillMsg = (tpl, name, step) => tpl.replace(/\[Name\]/g, name).replace(/\[Step\]/g, step)

// tel: link for a stored phone. Stored numbers are digits only, Nigerian
// ones normalised to 234XXXXXXXXXX, foreign ones as their own digits.
export const telHref = (p) => (p ? `tel:+${p}` : undefined)

// "06 Apr" (or "06 Apr 2001") from the contact's birthday fields.
export const fmtBirthday = (c, months) =>
  c?.birth_day && c?.birth_month ? `${String(c.birth_day).padStart(2, '0')} ${months[c.birth_month - 1]}${c.birth_year ? ' ' + c.birth_year : ''}` : ''

// Short relative-ish date: "today", "yesterday", else "Tue 27 Oct".
export const fmtWhen = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
