import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ChildrenListPage from './pages/ChildrenListPage'
import ChildDetailPage from './pages/ChildDetailPage'
import ChildFormPage from './pages/ChildFormPage'
import UsersListPage from './pages/UsersListPage'
import UserFormPage from './pages/UserFormPage'
import UserActivityPage from './pages/UserActivityPage'
import InstitutionsListPage from './pages/InstitutionsListPage'
import InstitutionFormPage from './pages/InstitutionFormPage'

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

          {/* Niños */}
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

          {/* Usuarios */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute>
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id/activity"
            element={
              <ProtectedRoute>
                <UserActivityPage />
              </ProtectedRoute>
            }
          />

          {/* Instituciones */}
          <Route
            path="/institutions"
            element={
              <ProtectedRoute>
                <InstitutionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions/new"
            element={
              <ProtectedRoute>
                <InstitutionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions/:id"
            element={
              <ProtectedRoute>
                <InstitutionFormPage />
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
