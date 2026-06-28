import { NavLink } from 'react-router-dom'
import { X, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  title: string
  items: NavItem[]
  open: boolean
  onClose: () => void
}

export default function Sidebar({ title, items, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop — mobile/tablet only, shown while drawer is open */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-white">TableTrack</p>
            <p className="text-xs text-slate-400">{title}</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
