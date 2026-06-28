import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'

import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
import SupervisorLayout from './layouts/SupervisorLayout'
import CustomerLayout from './layouts/CustomerLayout'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

import Dashboard from './pages/admin/Dashboard'
import Customers from './pages/admin/Customers'
import CustomerForm from './pages/admin/CustomerForm'
import CustomerDetail from './pages/admin/CustomerDetail'

import Profile from './pages/customer/Profile'
import Scanner from './pages/customer/Scanner'

import SupervisorScanner from './pages/supervisor/Scanner'
import SupervisorProfile from './pages/supervisor/Profile'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (user.role === 'supervisor') return <Navigate to="/supervisor/scan" replace />
  return <Navigate to="/customer/profile" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/customers/new" element={<CustomerForm />} />
          <Route path="/admin/customers/:id" element={<CustomerDetail />} />
          <Route path="/admin/customers/:id/edit" element={<CustomerForm />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['supervisor']} />}>
        <Route element={<SupervisorLayout />}>
          <Route path="/supervisor/scan" element={<SupervisorScanner />} />
          <Route path="/supervisor/profile" element={<SupervisorProfile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
        <Route element={<CustomerLayout />}>
          <Route path="/customer/profile" element={<Profile />} />
          <Route path="/customer/scan" element={<Scanner />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
