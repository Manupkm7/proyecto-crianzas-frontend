import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ChildrenListPage from './pages/ChildrenListPage'
import ChildDetailPage from './pages/ChildDetailPage'
import ChildFormPage from './pages/ChildFormPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protegidas — requieren sesión activa */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children"
            element={
              <ProtectedRoute>
                <ChildrenListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children/new"
            element={
              <ProtectedRoute>
                <ChildFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children/:id"
            element={
              <ProtectedRoute>
                <ChildDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Cualquier ruta desconocida redirige al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
