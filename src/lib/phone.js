export function normPhoneJS(p) {
  const d = (p || '').replace(/\D/g, '')
  return /^0\d{10}$/.test(d) ? '234' + d.slice(1) : d
}
