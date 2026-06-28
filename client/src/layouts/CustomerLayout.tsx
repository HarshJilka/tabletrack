import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ScanLine, User } from 'lucide-react'
import Sidebar, { type NavItem } from '../components/Sidebar'
import Navbar from '../components/Navbar'

const NAV_ITEMS: NavItem[] = [
  { to: '/customer/scan', label: 'Scanner', icon: ScanLine },
  { to: '/customer/profile', label: 'My Profile', icon: User },
]

const TITLES: Record<string, string> = {
  '/customer/scan': 'Scanner',
  '/customer/profile': 'My Profile',
}

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title =
    Object.entries(TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'TableTrack'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar title="Customer Portal" items={NAV_ITEMS} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar pageTitle={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
