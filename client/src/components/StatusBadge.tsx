const STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
  unapproved: 'bg-amber-100 text-amber-700',
}

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STYLES[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  )
}
