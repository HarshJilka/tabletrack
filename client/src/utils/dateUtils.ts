export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '—'
  return new Date(dateTimeStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '—'
  return `${formatDate(dateTimeStr)} · ${formatTime(dateTimeStr)}`
}

export function daysUntil(dateStr: string): number {
  const diff = +new Date(dateStr) - +new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
