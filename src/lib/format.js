export const initials = (n) => (n || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export const fmtPhone = (p) => (p || '').replace(/^234/, '0').replace(/(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')

export const waLink = (phone, msg) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`

export const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')

export const todayStr = () => new Date().toISOString().slice(0, 10)

export const fillMsg = (tpl, name, step) => tpl.replace(/\[Name\]/g, name).replace(/\[Step\]/g, step)
