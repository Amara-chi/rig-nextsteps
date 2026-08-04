export function downloadCSV(filename, rows) {
  const csv = rows
    .map((r) => r.map((v) => {
      v = String(v ?? '')
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
    }).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
