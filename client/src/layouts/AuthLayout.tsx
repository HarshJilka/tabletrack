import { Outlet } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-800">TableTrack</span>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
