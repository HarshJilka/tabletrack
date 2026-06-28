import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users } from 'lucide-react'
import Sidebar, { type NavItem } from '../components/Sidebar'
import Navbar from '../components/Navbar'

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/customers', label: 'Customers', icon: Users },
]

const TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/customers': 'Customers',
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title =
    Object.entries(TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Admin'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar title="Admin Console" items={NAV_ITEMS} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar pageTitle={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
